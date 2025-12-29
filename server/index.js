// server/index.js
import "dotenv/config";
import crypto from "crypto";
import express from "express";
import nodemailer from "nodemailer";
import { createClient as createRedisClient } from "redis";
import { createClient } from "@supabase/supabase-js";
import { renderDocumentHtml } from "./renderDocumentHtml.js";

const PORT = process.env.PORT || 4000;
const app = express();
app.disable("x-powered-by");

const jsonParser = express.json({ limit: "10mb" });
app.use((req, res, next) => {
  // nur Requests mit Body parsen (GET/HEAD brauchen das nicht)
  if (req.method === "GET" || req.method === "HEAD") return next();
  // /api/email hat seinen eigenen Parser weiter unten
  if (req.path === "/api/email") return next();
  return jsonParser(req, res, next);
});

const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? 1);
app.set("trust proxy", Number.isFinite(TRUST_PROXY) ? TRUST_PROXY : 1);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// robustes Base-URL handling: ENV > Vercel URL > localhost
const RAW_APP_BASE_URL =
  process.env.APP_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${PORT}`);
const APP_BASE_URL = String(RAW_APP_BASE_URL).trim().replace(/\/+$/, "");

const DEFAULT_FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER;
const SENDER_DOMAIN_NAME = process.env.SENDER_DOMAIN_NAME || "Lightning Bold";
const IS_VERCEL = Boolean(process.env.VERCEL);

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    : null;

let supabaseConfigLogged = false;
const requireSupabase = () => {
  if (!supabaseAdmin) {
    if (!supabaseConfigLogged) {
      console.warn("[config] Missing Supabase admin config.", {
        hasUrl: Boolean(SUPABASE_URL),
        hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE),
      });
      supabaseConfigLogged = true;
    }
    const err = new Error("Supabase service role not configured.");
    err.status = 500;
    err.code = "SUPABASE_NOT_CONFIGURED";
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
let playwrightPromise = null;

const loadPlaywright = async () => {
  if (!playwrightPromise) {
    playwrightPromise = (async () => {
      if (IS_VERCEL) {
        return await import("playwright-core");
      }
      try {
        return await import("playwright");
      } catch (error) {
        return await import("playwright-core");
      }
    })();
  }
  return playwrightPromise;
};

const resolveChromiumLauncher = async () => {
  const playwrightModule = await loadPlaywright();
  return playwrightModule.chromium ?? playwrightModule.default?.chromium;
};

const getChromiumLaunchOptions = async () => {
  if (!IS_VERCEL) {
    return { headless: true };
  }
  let chromiumModule;
  try {
    chromiumModule = await import("@sparticuz/chromium");
  } catch (error) {
    console.error("[pdf] Missing @sparticuz/chromium dependency for Vercel runtime.");
    const err = new Error("Chromium dependency missing.");
    err.status = 500;
    err.code = "CHROMIUM_MISSING";
    throw err;
  }
  const chromium = chromiumModule.default ?? chromiumModule;
  return {
    args: chromium.args,
    executablePath: await chromium.executablePath(),

  };
};

const getBrowser = async () => {
  if (!browserPromise) {
    try {
      const chromiumLauncher = await resolveChromiumLauncher();
      if (!chromiumLauncher) {
        throw new Error("Chromium launcher is not available.");
      }
      const launchOptions = await getChromiumLaunchOptions();
      browserPromise = chromiumLauncher.launch(launchOptions);
    } catch (error) {
      browserPromise = null;
      throw error;
    }
  }
  return browserPromise;
};

let mailerPromise = null;
let smtpConfigLogged = false;

const logMissingEnv = (scope, missing = []) => {
  if (missing.length === 0) return;
  console.warn(`[config] Missing ${scope} env vars`, missing);
};

const logServerConfigOnce = () => {
  if (process.env.LOG_SERVER_CONFIG !== "1") return;
  console.info("[config] runtime", {
    isVercel: IS_VERCEL,
    hasSupabaseUrl: Boolean(SUPABASE_URL),
    hasSupabaseServiceRole: Boolean(SUPABASE_SERVICE_ROLE),
    hasSmtpHost: Boolean(process.env.SMTP_HOST),
    hasSmtpUser: Boolean(process.env.SMTP_USER),
    hasSmtpFrom: Boolean(DEFAULT_FROM_EMAIL),
    hasRedis: Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL),
  });
};

const validateSmtpEnv = () => {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!DEFAULT_FROM_EMAIL) missing.push("SMTP_FROM");
  if (process.env.SMTP_USER && !process.env.SMTP_PASS) missing.push("SMTP_PASS");
  return { ok: missing.length === 0, missing };
};

const ensureMailer = async () => {
  const transporter = await getMailer();
  if (!transporter || !DEFAULT_FROM_EMAIL) {
    const err = new Error("SMTP not configured");
    err.status = 501;
    err.code = "SMTP_NOT_CONFIGURED";
    throw err;
  }
  return transporter;
};

const getMailer = async () => {
  if (!mailerPromise) {
    const validation = validateSmtpEnv();
    if (!validation.ok) {
      if (!smtpConfigLogged) {
        logMissingEnv("smtp", validation.missing);
        smtpConfigLogged = true;
      }
      return null;
    }
    const host = process.env.SMTP_HOST;
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

const EMAIL_RATE_LIMIT = Number.isFinite(Number(process.env.EMAIL_RATE_LIMIT))
  ? Number(process.env.EMAIL_RATE_LIMIT)
  : 10;
const EMAIL_RATE_WINDOW_MS = Number.isFinite(Number(process.env.EMAIL_RATE_WINDOW_MS))
  ? Number(process.env.EMAIL_RATE_WINDOW_MS)
  : 10 * 60 * 1000;
const EMAIL_SUBJECT_MAX = 200;
const EMAIL_MESSAGE_MAX = 5000;

const EMAIL_RATE_WINDOW_BUFFER_SEC = 30;
const EMAIL_FALLBACK_SWEEP_MS = 60 * 1000;
const EMAIL_FALLBACK_MAX_KEYS = 50_000;
const EMAIL_FALLBACK_BUFFER_MS = 30 * 1000;
const REDIS_RETRY_COOLDOWN_MS = 30 * 1000;
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || "";

logServerConfigOnce();

let redisClient;
let lastRedisErrorAt = 0;
let fallbackLastSweep = 0;
const fallbackStore = new Map();

const getRedisClient = async () => {
  if (!REDIS_URL) return null;
  const now = Date.now();
  if (now - lastRedisErrorAt < REDIS_RETRY_COOLDOWN_MS) return null;

  if (!redisClient) {
    redisClient = createRedisClient({
      url: REDIS_URL,
      socket: { reconnectStrategy: false },
    });
    redisClient.on("error", (err) => {
      lastRedisErrorAt = Date.now();
      console.error("Redis error", err);
    });
  }

  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      lastRedisErrorAt = Date.now();
      return null;
    }
  }

  return redisClient;
};

const buildEmailRateKey = (scope, id, windowStartEpoch) =>
  `rl:email:${scope}:${id}:${windowStartEpoch}`;

const getWindowStartEpochSec = (nowSec, windowSec) =>
  Math.floor(nowSec / windowSec) * windowSec;

const sweepFallbackStore = (now) => {
  if (now - fallbackLastSweep < EMAIL_FALLBACK_SWEEP_MS) return;
  for (const [key, entry] of fallbackStore.entries()) {
    if (entry.expiresAt <= now) {
      fallbackStore.delete(key);
    }
  }
  while (fallbackStore.size > EMAIL_FALLBACK_MAX_KEYS) {
    const oldestKey = fallbackStore.keys().next().value;
    if (!oldestKey) break;
    fallbackStore.delete(oldestKey);
  }
  fallbackLastSweep = now;
};

const checkEmailRateLimitInMemory = (scope, id, limit, windowMs) => {
  const now = Date.now();
  sweepFallbackStore(now);

  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowEndMs = windowStartMs + windowMs;
  const windowStartEpoch = Math.floor(windowStartMs / 1000);
  const key = buildEmailRateKey(scope, id, windowStartEpoch);
  const expiresAt = windowEndMs + EMAIL_FALLBACK_BUFFER_MS;

  const entry = fallbackStore.get(key);
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - now) / 1000));

  if (!entry || entry.expiresAt <= now) {
    fallbackStore.set(key, { count: 1, expiresAt });
    return { allowed: true, retryAfterSeconds };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds };
};

const checkEmailRateLimitRedis = async (client, scope, id, limit, windowMs) => {
  const windowSec = Math.max(1, Math.floor(windowMs / 1000));
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = getWindowStartEpochSec(nowSec, windowSec);
  const windowEnd = windowStart + windowSec;
  const key = buildEmailRateKey(scope, id, windowStart);
  const ttl = windowSec + EMAIL_RATE_WINDOW_BUFFER_SEC;

  const result = await client.multi().incr(key).expire(key, ttl).exec();
  const rawCount = result?.[0];
  const count = Number(Array.isArray(rawCount) ? rawCount[1] : rawCount ?? 0);
  const retryAfterSeconds = Math.max(1, windowEnd - nowSec);

  return { allowed: count <= limit, retryAfterSeconds };
};

const checkEmailRateLimit = async (scope, id) => {
  const client = await getRedisClient();
  if (client) {
    try {
      return await checkEmailRateLimitRedis(client, scope, id, EMAIL_RATE_LIMIT, EMAIL_RATE_WINDOW_MS);
    } catch (err) {
      lastRedisErrorAt = Date.now();
    }
  }

  return checkEmailRateLimitInMemory(scope, id, EMAIL_RATE_LIMIT, EMAIL_RATE_WINDOW_MS);
};

const sendError = (res, status, code, message) =>
  res.status(status).json({ ok: false, error: { code, message } });

const sendRateLimit = (res, retryAfterSeconds) =>
  res.status(429).json({
    ok: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many requests.",
      retryAfterSeconds,
    },
  });

const isValidEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const emailJsonParser = express.json({ limit: "9mb" });
const emailJsonErrorHandler = (err, _req, res, next) => {
  if (err?.type === "entity.too.large") {
    return sendError(res, 413, "payload_too_large", "Payload too large.");
  }
  if (err?.type === "entity.parse.failed") {
    return sendError(res, 400, "invalid_json", "Invalid JSON payload.");
  }
  return next(err);
};

const emailRateLimitGuard = async (req, res, next) => {
  if (req.ip) {
    const result = await checkEmailRateLimit("ip", req.ip);
    if (!result.allowed) {
      return sendRateLimit(res, result.retryAfterSeconds);
    }
  }
  return next();
};

const emailAuthGuard = async (req, res, next) => {
  const auth = req.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        req.user = data.user;
      }
    } catch (err) {
      return sendError(res, err?.status || 500, "auth_error", "Auth error.");
    }
  }

  if (req.user?.id) {
    const result = await checkEmailRateLimit("user", req.user.id);
    if (!result.allowed) {
      return sendRateLimit(res, result.retryAfterSeconds);
    }
  }

  return next();
};

const requireAuth = async (req, res, next) => {
  try {
    const auth = req.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return sendError(res, 401, "unauthorized", "Unauthorized");
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return sendError(res, 401, "unauthorized", "Unauthorized");
    }
    req.user = data.user;
    next();
  } catch (err) {
    console.error("Auth error", err);
    return sendError(res, 500, "auth_error", "Auth error.");
  }
};

const lockInvoiceAfterSend = async ({ supabase, invoiceId, userId }) => {
  if (!invoiceId || !userId) return;
  const db = supabase ?? requireSupabase();
  const nowIso = new Date().toISOString();
  const { error } = await db
    .from("invoices")
    .update({ is_locked: true, finalized_at: nowIso })
    .eq("id", invoiceId)
    .eq("user_id", userId);
  if (error) {
    const err = new Error("Failed to lock invoice");
    err.status = 500;
    throw err;
  }
};

const updateSendMetadata = async ({ type, docId, userId, via }) => {
  if (!docId || !userId) return;
  const db = requireSupabase();
  const nowIso = new Date().toISOString();
  const table = type === "invoice" ? "invoices" : "offers";

  const { data: row } = await db
    .from(table)
    .select("sent_count, sent_at, status")
    .eq("id", docId)
    .eq("user_id", userId)
    .maybeSingle();

  const sentCount = Number(row?.sent_count ?? 0) + 1;

  const updatePayload = {
    sent_at: row?.sent_count ? row?.sent_at ?? null : nowIso,
    last_sent_at: nowIso,
    sent_count: sentCount,
    sent_via: via ?? "EMAIL",
  };

  if (type === "invoice" && row?.status === "DRAFT") {
    updatePayload.status = "SENT";
  }
  if (type === "offer" && row?.status === "DRAFT") {
    updatePayload.status = "SENT";
  }

  const { error } = await db
    .from(table)
    .update(updatePayload)
    .eq("id", docId)
    .eq("user_id", userId);

  if (error) {
    const err = new Error("Failed to update send metadata");
    err.status = 500;
    throw err;
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
  const transporter = await ensureMailer();

  // Mail-Link direkt auf den API-Verify Endpoint (der redirectet dann zurück ins Frontend)
  const verificationUrl = `${APP_BASE_URL}/api/sender-identities/verify?token=${encodeURIComponent(token)}`;

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

const normalizeDocType = (value) => {
  const type = String(value ?? "").toLowerCase();
  return type === "invoice" || type === "offer" ? type : null;
};

const buildPdfFilename = ({ type, doc, client }) => {
  const prefix = type === "invoice" ? "RE" : "ANG";
  const clientName = client?.companyName ?? client?.name ?? "";
  const datePart = doc?.date ?? "";
  const num = doc?.number ?? "0000";
  const raw = `${prefix}-${num}_${clientName}_${datePart}.pdf`;
  return sanitizeFilename(raw);
};

const mapInvoiceRow = (row = {}) => ({
  id: row.id,
  number: row.number,
  clientId: row.client_id,
  projectId: row.project_id ?? undefined,
  date: row.date,
  dueDate: row.due_date ?? "",
  positions: row.positions ?? [],
  introText: row.intro_text ?? "",
  footerText: row.footer_text ?? "",
  vatRate: Number(row.vat_rate ?? 0),
});

const mapOfferRow = (row = {}) => ({
  id: row.id,
  number: row.number,
  clientId: row.client_id,
  projectId: row.project_id ?? undefined,
  date: row.date,
  validUntil: row.valid_until ?? "",
  positions: row.positions ?? [],
  introText: row.intro_text ?? "",
  footerText: row.footer_text ?? "",
  vatRate: Number(row.vat_rate ?? 0),
});

const mapSettingsRow = (row = {}) => ({
  companyName: row.company_name ?? "",
  address: row.address ?? "",
  taxId: row.tax_id ?? "",
  iban: row.iban ?? "",
  bic: row.bic ?? "",
  bankName: row.bank_name ?? "",
  footerText: row.footer_text ?? "",
});

const mapClientRow = (row = {}) => ({
  companyName: row.company_name ?? "",
  name: row.company_name ?? "",
  contactPerson: row.contact_person ?? "",
  email: row.email ?? "",
  address: row.address ?? "",
});

const stableStringify = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",")}}`;
};

const hashPayload = (payload) =>
  crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");

const loadDocumentPayloadFromDb = async ({ type, docId, userId, supabase }) => {
  const resolvedType = normalizeDocType(type);
  if (!resolvedType) {
    const err = new Error("Invalid document type");
    err.status = 400;
    throw err;
  }
  if (!docId) {
    const err = new Error("Missing document id");
    err.status = 400;
    throw err;
  }

  const db = supabase ?? requireSupabase();
  const table = resolvedType === "invoice" ? "invoices" : "offers";

  if (process.env.DEBUG_EMAIL_DOC === "1") {
    console.log("[email] loadDocumentPayloadFromDb", { type: resolvedType, docId, userId, table });
  }

  const selectFields = resolvedType === "invoice"
    ? "id, user_id, number, client_id, project_id, date, due_date, positions, intro_text, footer_text, vat_rate"
    : "id, user_id, number, client_id, project_id, date, valid_until, positions, intro_text, footer_text, vat_rate";

  const { data: docRow, error: docError } = await db
    .from(table)
    .select(selectFields)
    .eq("id", docId)
    .eq("user_id", userId)
    .single();

  if (docError || !docRow) {
    if (process.env.DEBUG_EMAIL_DOC === "1") {
      console.log("[email] document lookup failed", {
        error: docError?.message ?? docError ?? null,
        docId,
        userId,
        table,
      });
    }
    const err = new Error("Document not found");
    err.status = 404;
    throw err;
  }

  const doc = resolvedType === "invoice" ? mapInvoiceRow(docRow) : mapOfferRow(docRow);

  const { data: settingsRow } = await db
    .from("user_settings")
    .select("company_name, address, tax_id, iban, bic, bank_name, footer_text")
    .eq("user_id", userId)
    .maybeSingle();

  const settings = mapSettingsRow(settingsRow ?? {});

  let client = mapClientRow({});
  if (doc.clientId) {
    const { data: clientRow } = await db
      .from("clients")
      .select("id, company_name, contact_person, email, address")
      .eq("id", doc.clientId)
      .eq("user_id", userId)
      .maybeSingle();
    if (clientRow) client = mapClientRow(clientRow);
  }

  return { doc, settings, client };
};

const createPdfBufferFromPayload = async (type, payload) => {
  const html = renderDocumentHtml({
    type,
    doc: payload?.doc ?? {},
    settings: payload?.settings ?? {},
    client: payload?.client ?? {},
  });

  if (process.env.PDF_TEST_MODE === "1") {
    return Buffer.from(html, "utf8");
  }

  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2000 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  await page.close();
  return pdfBuffer;
};

const createPdfAttachment = async ({ type, payload }) => {
  const buffer = await createPdfBufferFromPayload(type, payload);
  const filename = buildPdfFilename({ type, doc: payload.doc, client: payload.client });
  return { buffer, filename };
};

const enforceLegacyPayloadMatch = (body, payload) => {
  if (!body) return;
  const hasLegacy = body.doc || body.settings || body.client || body.pdfBase64;
  if (!hasLegacy) return;
  if (!body.payloadHash) {
    const err = new Error("Legacy payload hash required");
    err.status = 400;
    err.code = "legacy_hash_required";
    throw err;
  }
  const expected = hashPayload(payload);
  if (String(body.payloadHash) !== expected) {
    const err = new Error("Legacy payload mismatch");
    err.status = 409;
    err.code = "payload_mismatch";
    throw err;
  }
};

app.post("/api/pdf", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`pdf_user_${req.user.id}`, 60);
    if (req.ip) checkRateLimit(`pdf_ip_${req.ip}`, 120);

    const docId = req.body?.docId ?? req.body?.documentId ?? null;
    const type = normalizeDocType(req.body?.type ?? req.body?.documentType);
    if (!docId || !type) {
      return sendError(res, 400, "bad_request", "Missing required fields: docId, type");
    }

    const payload = await loadDocumentPayloadFromDb({
      type,
      docId,
      userId: req.user.id,
    });

    enforceLegacyPayloadMatch(req.body, payload);

    const { buffer, filename } = await createPdfAttachment({ type, payload });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.status(200).send(buffer);
  } catch (err) {
    const status = err?.status || 500;
    const code = err?.code || "pdf_generation_failed";
    console.error("PDF generation failed", err);
    return sendError(res, status, code, "PDF generation failed.");
  }
});

app.post("/api/sender-identities", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const email = normalizeEmail(req.body?.email);
    const displayName = String(req.body?.displayName ?? "").trim() || null;

    if (!email || !email.includes("@")) {
      return sendError(res, 400, "invalid_email", "Invalid email.");
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
      return sendError(res, 500, "sender_identity_create_failed", "Failed to create sender identity.");
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
    if (err?.code === "SMTP_NOT_CONFIGURED") {
      return sendError(res, 501, "smtp_not_configured", "SMTP not configured.");
    }
    return sendError(res, err.status || 500, "sender_identity_create_failed", "Sender identity create failed.");
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
      return sendError(res, 404, "not_found", "Not found.");
      return;
    }
    if (identity.status === "verified") {
      return sendError(res, 400, "already_verified", "Already verified.");
      return;
    }
    if (identity.status === "disabled") {
      return sendError(res, 400, "sender_identity_disabled", "Sender identity disabled.");
      return;
    }

    checkRateLimit(`verify_user_${userId}`, 5);
    checkRateLimit(`verify_email_${identity.email}`, 3);
    if (req.ip) checkRateLimit(`verify_ip_${req.ip}`, 20);

    if (identity.last_verification_sent_at) {
      const lastSent = new Date(identity.last_verification_sent_at).getTime();
      if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
        return sendError(res, 429, "cooldown_active", "Cooldown active.");
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
    if (err?.status === 429) {
      return sendError(
        res,
        429,
        "rate_limited",
        "Zu viele Verifizierungsanfragen. Bitte kurz warten und erneut versuchen."
      );
    }
    if (err?.code === "SMTP_NOT_CONFIGURED") {
      return sendError(res, 501, "smtp_not_configured", "SMTP not configured.");
    }
    return sendError(res, err?.status || 500, "resend_failed", "Resend failed.");
  }
});

app.get("/api/sender-identities/verify", async (req, res) => {
  try {
    const supabase = requireSupabase();
    if (req.ip) checkRateLimit(`verify_ip_${req.ip}`, VERIFY_LIMIT_PER_IP_PER_MIN, 60 * 1000);
    const redirectBase = APP_BASE_URL.replace(/\/$/, "");

    const token = String(req.query?.token ?? "");
    if (!token) {
      res.redirect(`${redirectBase}/app/settings/email/verify?status=invalid`);
      return;
    }
    const tokenHash = hashToken(token);
    const { data: tokenRow } = await supabase
      .from("sender_identity_tokens")
      .select("id, sender_identity_id, used_at, expires_at")
      .eq("token_hash", tokenHash)
      .single();

    if (!tokenRow) {
      res.redirect(`${redirectBase}/app/settings/email/verify?status=invalid`);
      return;
    }
    if (tokenRow.used_at) {
      res.redirect(`${redirectBase}/app/settings/email/verify?status=used`);
      return;
    }
    if (new Date(tokenRow.expires_at) <= new Date()) {
      res.redirect(`${redirectBase}/app/settings/email/verify?status=expired`);
      return;
    }

    const { data: identity } = await supabase
      .from("sender_identities")
      .select("id, user_id, status")
      .eq("id", tokenRow.sender_identity_id)
      .single();

    if (!identity) {
      res.redirect(`${redirectBase}/app/settings/email/verify?status=invalid`);
      return;
    }

    const { count: verifiedCount } = await supabase
      .from("sender_identities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", identity.user_id)
      .eq("status", "verified");

    if ((verifiedCount ?? 0) >= 5 && identity.status !== "verified") {
      res.redirect(`${redirectBase}/app/settings/email/verify?status=limit`);
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

    res.redirect(`${redirectBase}/app/settings/email/verify?status=success`);
  } catch (err) {
    console.error("Verify sender identity failed", err);
    res.redirect(`${APP_BASE_URL.replace(/\/$/, "")}/app/settings/email/verify?status=error`);
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
      return sendError(res, 500, "sender_identities_fetch_failed", "Failed to fetch sender identities.");
      return;
    }
    res.json({ items: data ?? [] });
  } catch (err) {
    console.error("List sender identities failed", err);
    return sendError(res, 500, "sender_identities_fetch_failed", "Failed to fetch sender identities.");
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
      return sendError(res, 404, "not_found", "Not found.");
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
    return sendError(res, 500, "disable_failed", "Disable failed.");
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
    return sendError(res, err.status || 500, "update_failed", "Update failed.");
  }
});

app.post("/api/test-email", requireAuth, async (req, res) => {
  try {
    const supabase = requireSupabase();
    const userId = req.user.id;
    const senderIdentityId = req.body?.senderIdentityId;
    if (!senderIdentityId) {
      return sendError(res, 400, "missing_sender_identity_id", "Missing senderIdentityId.");
      return;
    }
    const identity = await ensureVerifiedIdentity({ userId, senderIdentityId });

    const transporter = await ensureMailer();

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
    if (err?.code === "SMTP_NOT_CONFIGURED") {
      return sendError(res, 501, "smtp_not_configured", "SMTP not configured.");
    }
    return sendError(res, err.status || 500, "test_email_failed", "Test email failed.");
  }
});

app.post(
  "/api/email",
  emailJsonParser,
  emailJsonErrorHandler,
  emailRateLimitGuard,
  emailAuthGuard,
  async (req, res) => {
    try {
      if (!req.user?.id) {
        return sendError(res, 401, "unauthorized", "Unauthorized");
      }
      const userId = req.user.id;

      const {
        to,
        subject,
        message,
        senderIdentityId,
        documentId,
        documentType,
      } = req.body ?? {};

      const docId = req.body?.docId ?? documentId ?? null;
      const type = normalizeDocType(req.body?.type ?? documentType);

      if (!docId || !type || !to || !subject || !senderIdentityId) {
        return sendError(
          res,
          400,
          "bad_request",
          "Missing required fields: docId, type, to, subject, senderIdentityId"
        );
      }

      const normalizedTo = normalizeEmail(to);
      if (!isValidEmail(normalizedTo)) {
        return sendError(res, 400, "invalid_email", "Invalid recipient email.");
      }

      const subjectText = String(subject ?? "");
      if (subjectText.length > EMAIL_SUBJECT_MAX) {
        return sendError(res, 400, "subject_too_long", "Subject too long.");
      }

      const messageText = String(message ?? "");
      if (messageText.length > EMAIL_MESSAGE_MAX) {
        return sendError(res, 400, "message_too_long", "Message too long.");
      }

      const payload = await loadDocumentPayloadFromDb({
        type,
        docId,
        userId,
      });

      enforceLegacyPayloadMatch(req.body, payload);

      const transporter = await ensureMailer();
      const resolvedFrom = DEFAULT_FROM_EMAIL;

      if (!resolvedFrom) {
        return sendError(res, 501, "EMAIL_NOT_CONFIGURED", "E-Mail Versand ist nicht konfiguriert.");
      }

      const identity = await ensureVerifiedIdentity({ userId, senderIdentityId });
      const { data: settings } = await requireSupabase()
        .from("user_settings")
        .select("company_name")
        .eq("user_id", userId)
        .maybeSingle();

      const displayName = identity.display_name || settings?.company_name || "";
      const replyTo = buildReplyTo(identity.email, displayName);
      const fromName = displayName || SENDER_DOMAIN_NAME;
      const from = `${fromName} via ${SENDER_DOMAIN_NAME} <${resolvedFrom}>`;

      const { buffer, filename } = await createPdfAttachment({ type, payload });

      const info = await transporter.sendMail({
        from,
        to: normalizedTo,
        subject: subjectText,
        text: messageText ?? "",
        replyTo,
        sender: `${SENDER_DOMAIN_NAME} <${resolvedFrom}>`,
        attachments: [
          {
            filename,
            content: buffer,
            contentType: "application/pdf",
          },
        ],
      });

      await requireSupabase()
        .from("sender_identities")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", identity.id);

      await audit({
        userId,
        action: "invoice_email_sent",
        entityType: type,
        entityId: docId ?? null,
        meta: { to: normalizedTo, sender_identity_id: identity.id, message_id: info?.messageId ?? null },
      });

      await updateSendMetadata({ type, docId, userId, via: "EMAIL" });

      if (type === "invoice") {
        await lockInvoiceAfterSend({ invoiceId: docId, userId });
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Email send failed", err);
      if (err?.code === "SUPABASE_NOT_CONFIGURED") {
        return sendError(res, 500, "SUPABASE_NOT_CONFIGURED", "Supabase not configured.");
      }
      if (err?.code === "SMTP_NOT_CONFIGURED") {
        return sendError(
          res,
          501,
          "EMAIL_NOT_CONFIGURED",
          "E-Mail Versand ist nicht konfiguriert. Bitte SMTP_HOST/SMTP_USER/SMTP_PASS setzen."
        );
      }
      const message = typeof err?.message === "string" && err.message.trim().length > 0
        ? err.message
        : "Email send failed.";
      return sendError(res, 500, "EMAIL_SEND_FAILED", message);
    }
  }
);

// health endpoints (API + optional legacy)
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

if (process.env.SERVER_TEST_MODE !== "1" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`PDF server listening on http://localhost:${PORT}`);
  });
}

export default app;

export {
  app,
  loadDocumentPayloadFromDb,
  createPdfBufferFromPayload,
  createPdfAttachment,
  hashPayload,
  buildPdfFilename,
  lockInvoiceAfterSend,
  updateSendMetadata,
};
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
