// server/index.js
import "dotenv/config";
import crypto from "crypto";
import express from "express";
import nodemailer from "nodemailer";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { renderDocumentHtml } from "./renderDocumentHtml.js";

const PORT = process.env.PORT || 4000;
const app = express();

app.use(express.json({ limit: "10mb" }));
const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? 1);
app.set("trust proxy", Number.isFinite(TRUST_PROXY) ? TRUST_PROXY : 1);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
const DEFAULT_FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER;
const SENDER_DOMAIN_NAME = process.env.SENDER_DOMAIN_NAME || "Lightning Bold";

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    : null;

const requireSupabase = () => {
  if (!supabaseAdmin) {
    const err = new Error("Supabase service role not configured.");
    err.status = 500;
    throw err;
  }
  return supabaseAdmin;
};

const sanitizeFilename = (name = "") =>
  String(name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";

let browserPromise = null;
const getBrowser = async () => {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
};

let mailerPromise = null;
const getMailer = async () => {
  if (!mailerPromise) {
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";
    mailerPromise = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ?? "",
          }
        : undefined,
    });
  }
  return mailerPromise;
};

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const generateToken = () => crypto.randomBytes(32).toString("base64url");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token, "utf8").digest("hex");

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFY_LIMIT_PER_IP_PER_MIN = 60;
const rateLimitBuckets = new Map();

const checkRateLimit = (key, limit, windowMs = RATE_LIMIT_WINDOW_MS) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key) ?? [];
  const filtered = bucket.filter((ts) => now - ts < windowMs);
  if (filtered.length >= limit) {
    const err = new Error("Rate limit exceeded");
    err.status = 429;
    throw err;
  }
  filtered.push(now);
  rateLimitBuckets.set(key, filtered);
};

const requireAuth = async (req, res, next) => {
  try {
    const auth = req.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.user = data.user;
    next();
  } catch (err) {
    console.error("Auth error", err);
    res.status(500).json({ error: "Auth error" });
  }
};

const audit = async ({ userId, action, entityType, entityId, meta }) => {
  const supabase = requireSupabase();
  await supabase.from("audit_events").insert({
    user_id: userId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    meta: meta ?? {},
  });
};

const buildReplyTo = (identityEmail, displayName) => {
  if (!displayName) return identityEmail;
  return `${displayName} <${identityEmail}>`;
};

const sendVerificationEmail = async ({ to, token, displayName }) => {
  const transporter = await getMailer();
  if (!transporter || !DEFAULT_FROM_EMAIL) {
    const err = new Error("SMTP not configured");
    err.status = 500;
    throw err;
  }
  const verificationUrl = `${APP_BASE_URL.replace(/\/$/, "")}/settings/email/verify?token=${encodeURIComponent(
    token
  )}`;
  const subject = "Bitte bestaetigen Sie Ihre Absenderadresse";
  const text = [
    `Hallo${displayName ? ` ${displayName}` : ""},`,
    "",
    "bitte bestaetigen Sie Ihre Absenderadresse fuer den Rechnungsversand.",
    "",
    verificationUrl,
    "",
    "Der Link ist 24 Stunden gueltig und nur einmal verwendbar.",
  ].join("\n");

  await transporter.sendMail({
    from: DEFAULT_FROM_EMAIL,
    to,
    subject,
    text,
  });
};

const ensureVerifiedIdentity = async ({ userId, senderIdentityId }) => {
  const supabase = requireSupabase();
  const { data: identity, error } = await supabase
    .from("sender_identities")
    .select("id, user_id, email, display_name, status")
    .eq("id", senderIdentityId)
    .eq("user_id", userId)
    .single();

  if (error || !identity) {
    const err = new Error("Sender identity not found");
    err.status = 404;
    throw err;
  }
  if (identity.status !== "verified") {
    const err = new Error("Sender identity not verified");
    err.status = 400;
    throw err;
  }
  return identity;
};

app.post("/api/pdf", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`pdf_user_${req.user.id}`, 60);
    if (req.ip) checkRateLimit(`pdf_ip_${req.ip}`, 120);
    const { type, doc, settings, client } = req.body ?? {};
    if (!type || !doc) {
      res.status(400).json({ error: "Missing required fields: type, doc" });
      return;
    }

    const html = renderDocumentHtml({
      type,
      doc: doc ?? {},
      settings: settings ?? {},
      client: client ?? {},
    });

    const browser = await getBrowser();
    const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    await page.close();

    const clientName = client?.companyName ?? client?.name ?? "";
    const datePart = doc?.date ?? "";
    const prefix = type === "invoice" ? "RE" : "ANG";
    const filename = `${prefix}-${doc?.number ?? "0000"}_${clientName}_${datePart}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(filename)}"`);
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed", err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

app.post("/api/sender-identities", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const email = normalizeEmail(req.body?.email);
    const displayName = String(req.body?.displayName ?? "").trim() || null;

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }

    checkRateLimit(`verify_user_${userId}`, 5);
    checkRateLimit(`verify_email_${email}`, 3);
    if (req.ip) checkRateLimit(`verify_ip_${req.ip}`, 20);

    const { data: existing } = await supabase
      .from("sender_identities")
      .select("id,status")
      .eq("user_id", userId)
      .eq("email", email)
      .maybeSingle();

    if (existing?.status === "verified") {
      res.json({ id: existing.id, email, status: "verified" });
      return;
    }

    const isNew = !existing;
    const nowIso = new Date().toISOString();
    const { data: identity, error: upsertError } = await supabase
      .from("sender_identities")
      .upsert(
        {
          user_id: userId,
          email,
          display_name: displayName,
          status: "pending",
          updated_at: nowIso,
        },
        { onConflict: "user_id,email" }
      )
      .select("id, email, display_name, status, last_verification_sent_at")
      .single();

    if (upsertError || !identity) {
      res.status(500).json({ error: "Failed to create sender identity" });
      return;
    }

    if (isNew) {
      await audit({
        userId,
        action: "sender_identity_created",
        entityType: "sender_identity",
        entityId: identity.id,
        meta: { email },
      });
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("sender_identity_tokens").insert({
      sender_identity_id: identity.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      request_ip: req.ip,
      user_agent: req.get("user-agent"),
    });

    await supabase
      .from("sender_identities")
      .update({ last_verification_sent_at: nowIso })
      .eq("id", identity.id);

    await sendVerificationEmail({ to: email, token, displayName });
    await audit({
      userId,
      action: "sender_identity_verification_sent",
      entityType: "sender_identity",
      entityId: identity.id,
      meta: { email },
    });

    res.json({
      id: identity.id,
      email: identity.email,
      display_name: identity.display_name,
      status: identity.status,
      last_verification_sent_at: nowIso,
    });
  } catch (err) {
    console.error("Create sender identity failed", err);
    res.status(err.status || 500).json({ error: "Sender identity create failed" });
  }
});

app.post("/api/sender-identities/:id/resend", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const identityId = req.params.id;

    const { data: identity, error } = await supabase
      .from("sender_identities")
      .select("id, email, status, last_verification_sent_at, display_name")
      .eq("id", identityId)
      .eq("user_id", userId)
      .single();

    if (error || !identity) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (identity.status === "verified") {
      res.status(400).json({ error: "Already verified" });
      return;
    }
    if (identity.status === "disabled") {
      res.status(400).json({ error: "Sender identity disabled" });
      return;
    }

    checkRateLimit(`verify_user_${userId}`, 5);
    checkRateLimit(`verify_email_${identity.email}`, 3);
    if (req.ip) checkRateLimit(`verify_ip_${req.ip}`, 20);

    if (identity.last_verification_sent_at) {
      const lastSent = new Date(identity.last_verification_sent_at).getTime();
      if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
        res.status(429).json({ error: "Cooldown active" });
        return;
      }
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    await supabase.from("sender_identity_tokens").insert({
      sender_identity_id: identity.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      request_ip: req.ip,
      user_agent: req.get("user-agent"),
    });

    await supabase
      .from("sender_identities")
      .update({ last_verification_sent_at: nowIso })
      .eq("id", identity.id);

    await sendVerificationEmail({
      to: identity.email,
      token,
      displayName: identity.display_name,
    });
    await audit({
      userId,
      action: "sender_identity_verification_sent",
      entityType: "sender_identity",
      entityId: identity.id,
      meta: { email: identity.email },
    });

    res.json({ ok: true, last_verification_sent_at: nowIso });
  } catch (err) {
    console.error("Resend sender identity failed", err);
    res.status(err.status || 500).json({ error: "Resend failed" });
  }
});

app.get("/api/sender-identities/verify", async (req, res) => {
  try {
    const supabase = requireSupabase();
    if (req.ip) checkRateLimit(`verify_ip_${req.ip}`, VERIFY_LIMIT_PER_IP_PER_MIN, 60 * 1000);
    const redirectBase = APP_BASE_URL.replace(/\/$/, "");

    const token = String(req.query?.token ?? "");
    if (!token) {
      res.redirect(`${redirectBase}/settings/email/verify?status=invalid`);
      return;
    }
    const tokenHash = hashToken(token);
    const { data: tokenRow } = await supabase
      .from("sender_identity_tokens")
      .select("id, sender_identity_id, used_at, expires_at")
      .eq("token_hash", tokenHash)
      .single();

    if (!tokenRow) {
      res.redirect(`${redirectBase}/settings/email/verify?status=invalid`);
      return;
    }
    if (tokenRow.used_at) {
      res.redirect(`${redirectBase}/settings/email/verify?status=used`);
      return;
    }
    if (new Date(tokenRow.expires_at) <= new Date()) {
      res.redirect(`${redirectBase}/settings/email/verify?status=expired`);
      return;
    }

    const { data: identity } = await supabase
      .from("sender_identities")
      .select("id, user_id, status")
      .eq("id", tokenRow.sender_identity_id)
      .single();

    if (!identity) {
      res.redirect(`${redirectBase}/settings/email/verify?status=invalid`);
      return;
    }

    const { count: verifiedCount } = await supabase
      .from("sender_identities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", identity.user_id)
      .eq("status", "verified");

    if ((verifiedCount ?? 0) >= 5 && identity.status !== "verified") {
      res.redirect(`${redirectBase}/settings/email/verify?status=limit`);
      return;
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("sender_identity_tokens")
      .update({ used_at: nowIso })
      .eq("id", tokenRow.id)
      .is("used_at", null);

    await supabase
      .from("sender_identities")
      .update({ status: "verified", verified_at: nowIso, updated_at: nowIso })
      .eq("id", identity.id);

    await audit({
      userId: identity.user_id,
      action: "sender_identity_verified",
      entityType: "sender_identity",
      entityId: identity.id,
    });

    res.redirect(`${redirectBase}/settings/email/verify?status=success`);
  } catch (err) {
    console.error("Verify sender identity failed", err);
    res.redirect(`${APP_BASE_URL.replace(/\/$/, "")}/settings/email/verify?status=error`);
  }
});

app.get("/api/sender-identities", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("sender_identities")
      .select("id, email, display_name, status, verified_at, last_verification_sent_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to fetch sender identities" });
      return;
    }
    res.json({ items: data ?? [] });
  } catch (err) {
    console.error("List sender identities failed", err);
    res.status(500).json({ error: "Failed to fetch sender identities" });
  }
});

app.delete("/api/sender-identities/:id", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const identityId = req.params.id;

    const { data: identity } = await supabase
      .from("sender_identities")
      .select("id, status")
      .eq("id", identityId)
      .eq("user_id", userId)
      .single();

    if (!identity) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await supabase
      .from("sender_identities")
      .update({ status: "disabled", updated_at: new Date().toISOString() })
      .eq("id", identityId);

    await audit({
      userId,
      action: "sender_identity_disabled",
      entityType: "sender_identity",
      entityId: identityId,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Disable sender identity failed", err);
    res.status(500).json({ error: "Disable failed" });
  }
});

app.patch("/api/settings/default_sender_identity", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const senderIdentityId = req.body?.senderIdentityId || null;

    if (senderIdentityId) {
      await ensureVerifiedIdentity({ userId, senderIdentityId });
    }

    await supabase
      .from("user_settings")
      .update({ default_sender_identity_id: senderIdentityId })
      .eq("user_id", userId);

    await audit({
      userId,
      action: "default_sender_identity_updated",
      entityType: "settings",
      entityId: null,
      meta: { senderIdentityId },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Update default sender identity failed", err);
    res.status(err.status || 500).json({ error: "Update failed" });
  }
});

app.post("/api/test-email", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const senderIdentityId = req.body?.senderIdentityId;
    if (!senderIdentityId) {
      res.status(400).json({ error: "Missing senderIdentityId" });
      return;
    }
    const identity = await ensureVerifiedIdentity({ userId, senderIdentityId });

    const transporter = await getMailer();
    if (!transporter || !DEFAULT_FROM_EMAIL) {
      res.status(500).json({ error: "SMTP not configured" });
      return;
    }

    const replyTo = buildReplyTo(identity.email, identity.display_name);
    const fromName = identity.display_name || SENDER_DOMAIN_NAME;
    const from = `${fromName} via ${SENDER_DOMAIN_NAME} <${DEFAULT_FROM_EMAIL}>`;

    await transporter.sendMail({
      from,
      to: identity.email,
      subject: "Testmail Lightning Bold",
      text: "Test erfolgreich.",
      replyTo,
      sender: `${SENDER_DOMAIN_NAME} <${DEFAULT_FROM_EMAIL}>`,
    });

    await audit({
      userId,
      action: "sender_identity_test_email_sent",
      entityType: "sender_identity",
      entityId: identity.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Test email failed", err);
    res.status(err.status || 500).json({ error: "Test email failed" });
  }
});

app.post("/api/email", async (req, res) => {
  try {
    const auth = req.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const supabase = requireSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = authData.user.id;

    const { to, subject, message, pdfBase64, filename, senderIdentityId, documentId, documentType } =
      req.body ?? {};

    if (!to || !subject || !pdfBase64 || !filename || !senderIdentityId) {
      res
        .status(400)
        .json({ error: "Missing required fields: to, subject, pdfBase64, filename, senderIdentityId" });
      return;
    }

    const transporter = await getMailer();
    const resolvedFrom = DEFAULT_FROM_EMAIL;

    if (!transporter || !resolvedFrom) {
      res.status(500).json({
        error:
          "E-Mail Versand ist nicht konfiguriert. Bitte SMTP_HOST/SMTP_USER/SMTP_PASS setzen.",
      });
      return;
    }

    const identity = await ensureVerifiedIdentity({ userId, senderIdentityId });
    const { data: settings } = await supabase
      .from("user_settings")
      .select("company_name")
      .eq("user_id", userId)
      .maybeSingle();

    const displayName = identity.display_name || settings?.company_name || "";
    const replyTo = buildReplyTo(identity.email, displayName);
    const fromName = displayName || SENDER_DOMAIN_NAME;
    const from = `${fromName} via ${SENDER_DOMAIN_NAME} <${resolvedFrom}>`;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: message ?? "",
      replyTo,
      sender: `${SENDER_DOMAIN_NAME} <${resolvedFrom}>`,
      attachments: [
        {
          filename: sanitizeFilename(filename),
          content: Buffer.from(String(pdfBase64), "base64"),
          contentType: "application/pdf",
        },
      ],
    });

    await supabase
      .from("sender_identities")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", identity.id);

    await audit({
      userId,
      action: "invoice_email_sent",
      entityType: documentType || "document",
      entityId: documentId ?? null,
      meta: { to, sender_identity_id: identity.id, message_id: info?.messageId ?? null },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Email send failed", err);
    res.status(500).json({ error: "Email send failed" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`PDF server listening on http://localhost:${PORT}`);
});

const closeBrowser = async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
};

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});
