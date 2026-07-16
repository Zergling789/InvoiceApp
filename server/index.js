// server/index.js
import dotenv from "dotenv";
import crypto from "crypto";
import express from "express";
import nodemailer from "nodemailer";
import { buildOfferRecipientEmail } from "./recipientEmail.js";
import { createClient as createRedisClient } from "redis";
import { createClient } from "@supabase/supabase-js";
import { renderDocumentHtml } from "./renderDocumentHtml.js";
import { buildCanonicalInvoice, canonicalInvoiceToRenderPayload } from "./einvoice/canonicalInvoice.js";
import { serializeCanonicalInvoiceToCii } from "./einvoice/ciiSerializer.js";
import { generateValidatedZugferd } from "./einvoice/zugferdGenerator.js";
import { buildAccountExportZip, loadOwnedAccountData } from "./accountDataExport.js";
import { processDueAccountDeletions, verifyWorkerSecret } from "./accountDeletionWorker.js";
import { generateInvoiceDraft } from "./ai/invoiceDraft.js";
import { rankPositionSuggestions } from "./positionSuggestions.js";
import { extractBusinessCard } from "./ai/businessCard.js";
import { createErrorReporter, evaluateReadiness, hashLogUserId, logEvent, logRequestError } from "./observability.js";
import {
  buildLegalAcceptanceRows,
  hasCurrentLegalAcceptances,
  requiredLegalVersions,
} from "./legalDocuments.js";
import { getStripe, resolvePrice, safeReturnUrl, subscriptionRow } from "./billing/stripeBilling.js";
import { incrementUsage, requireEntitlement } from "./billing/entitlements.js";
import { createEpcQrDataUrl } from "./paymentQr.js";
import {
  extractEmailAddress,
  generateToken,
  hashToken,
  normalizeEmail,
  parseEmailList,
  sanitizeFilename,
} from "./requestUtils.js";

// Keep production compatible with `.env`, while allowing one local file for
// both Vite and the Express process. Local values intentionally win.
dotenv.config();
if (
  process.env.NODE_ENV !== "production" &&
  process.env.NODE_ENV !== "test" &&
  process.env.SERVER_TEST_MODE !== "1"
) {
  dotenv.config({ path: ".env.local", override: false });
}

const PORT = process.env.PORT || 4000;
const app = express();
const errorReporter = createErrorReporter();
app.disable("x-powered-by");

const IS_PROD = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  const startedAt = performance.now();
  res.on("finish", () => {
    logEvent(res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info", "request_completed", {
      requestId: req.requestId,
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      userIdHash: hashLogUserId(req.user?.id),
    });
    if (res.statusCode >= 500) errorReporter.captureMessage("server_request_failed", { requestId: req.requestId, route: req.route?.path || req.path, statusCode: res.statusCode, durationMs: Math.round(performance.now() - startedAt) });
  });
  next();
});

const jsonParser = express.json({ limit: "10mb" });
app.use((req, res, next) => {
  // nur Requests mit Body parsen (GET/HEAD brauchen das nicht)
  if (req.method === "GET" || req.method === "HEAD") return next();
  // /api/email hat seinen eigenen Parser weiter unten
  if (req.path === "/api/email" || req.path.startsWith("/api/email/")) return next();
  if (req.path === "/api/stripe/webhook") return next();
  return jsonParser(req, res, next);
});

const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? 1);
app.set("trust proxy", Number.isFinite(TRUST_PROXY) ? TRUST_PROXY : 1);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// robustes Base-URL handling: ENV > Vercel URL > localhost
const RAW_APP_BASE_URL =
  process.env.APP_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${PORT}`);
const APP_BASE_URL = String(RAW_APP_BASE_URL).trim().replace(/\/+$/, "");

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  const fetchSite = req.get("sec-fetch-site");
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const isLocalDevelopmentOrigin = (() => {
    if (IS_PROD || !origin) return false;
    try {
      const hostname = new URL(origin).hostname;
      return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    } catch {
      return false;
    }
  })();
  if ((origin && ![APP_BASE_URL, requestOrigin].includes(origin) && !isLocalDevelopmentOrigin) || fetchSite === "cross-site") return sendError(res, 403, "CROSS_SITE_REQUEST_BLOCKED", "Cross-site request blocked.", req);
  return next();
});

const FROM_HEADER = process.env.SMTP_FROM || process.env.SMTP_USER;
const FROM_ADDRESS = extractEmailAddress(FROM_HEADER);
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
      logEvent("warn", "supabase_admin_configuration_missing", {
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

let supabaseUserConfigLogged = false;
const createUserSupabaseClient = (token) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!supabaseUserConfigLogged) {
      logEvent("warn", "supabase_anon_configuration_missing", {
        hasUrl: Boolean(SUPABASE_URL),
        hasAnonKey: Boolean(SUPABASE_ANON_KEY),
      });
      supabaseUserConfigLogged = true;
    }
    const err = new Error("Supabase anon key not configured.");
    err.status = 500;
    err.code = "SUPABASE_ANON_KEY_MISSING";
    throw err;
  }
  if (!token) {
    const err = new Error("Missing auth token.");
    err.status = 401;
    err.code = "NOT_AUTHENTICATED";
    throw err;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

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

const toBooleanHeadless = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return true;
};

const getChromiumLaunchOptions = async () => {
  if (!IS_VERCEL) {
    return { headless: true };
  }
  let chromiumModule;
  try {
    chromiumModule = await import("@sparticuz/chromium");
  } catch (error) {
    logEvent("error", "pdf_chromium_dependency_missing");
    const err = new Error("Chromium dependency missing.");
    err.status = 500;
    err.code = "CHROMIUM_MISSING";
    throw err;
  }
  const chromium = chromiumModule.default ?? chromiumModule;
  const headless = toBooleanHeadless(chromium.headless);
  if (typeof chromium.headless !== "boolean") {
    logEvent("warn", "pdf_chromium_headless_coerced", {
      headlessType: typeof chromium.headless,
    });
  }
  return {
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless,
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
  const browser = await browserPromise;
  if (browser && !browser.isConnected()) {
    try {
      await browser.close();
    } catch (error) {
      logEvent("warn", "pdf_browser_close_failed", { error });
    }
    browserPromise = null;
    return getBrowser();
  }
  return browser;
};

let mailerPromise = null;
let smtpConfigLogged = false;

const logMissingEnv = (scope, missing = []) => {
  if (missing.length === 0) return;
  logEvent("warn", "configuration_missing", { scope, missing });
};

const logServerConfigOnce = () => {
  if (process.env.LOG_SERVER_CONFIG !== "1") return;
  logEvent("info", "server_configuration", {
    isVercel: IS_VERCEL,
    hasSupabaseUrl: Boolean(SUPABASE_URL),
    hasSupabaseServiceRole: Boolean(SUPABASE_SERVICE_ROLE),
    hasSmtpHost: Boolean(process.env.SMTP_HOST),
    hasSmtpUser: Boolean(process.env.SMTP_USER),
    hasSmtpFrom: Boolean(FROM_HEADER),
    hasRedis: Boolean(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL),
  });
};

const validateSmtpEnv = () => {
  const missing = [];
  if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!FROM_HEADER) missing.push("SMTP_FROM");
  if (process.env.SMTP_USER && !process.env.SMTP_PASS) missing.push("SMTP_PASS");
  return { ok: missing.length === 0, missing };
};

const ensureMailer = async () => {
  const transporter = await getMailer();
  if (!transporter || !FROM_HEADER) {
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

const PDF_DOWNLOAD_TOKEN_TTL_MS = Number.isFinite(Number(process.env.PDF_DOWNLOAD_TOKEN_TTL_MS))
  ? Number(process.env.PDF_DOWNLOAD_TOKEN_TTL_MS)
  : 3 * 60 * 1000;
const PDF_DOWNLOAD_TOKEN_SWEEP_MS = 60 * 1000;

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
let pdfTokenLastSweep = 0;
const pdfDownloadTokenStore = new Map();

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
      logEvent("error", "redis_error", { error: err });
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

const sweepPdfDownloadTokens = (now) => {
  if (now - pdfTokenLastSweep < PDF_DOWNLOAD_TOKEN_SWEEP_MS) return;
  for (const [key, entry] of pdfDownloadTokenStore.entries()) {
    if (entry.expiresAt <= now) {
      pdfDownloadTokenStore.delete(key);
    }
  }
  pdfTokenLastSweep = now;
};

const storePdfDownloadTokenInMemory = (tokenHash, payload, ttlMs) => {
  const now = Date.now();
  sweepPdfDownloadTokens(now);
  pdfDownloadTokenStore.set(tokenHash, { payload, expiresAt: now + ttlMs });
};

const consumePdfDownloadTokenInMemory = (tokenHash) => {
  const now = Date.now();
  sweepPdfDownloadTokens(now);
  const entry = pdfDownloadTokenStore.get(tokenHash);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    pdfDownloadTokenStore.delete(tokenHash);
    return null;
  }
  pdfDownloadTokenStore.delete(tokenHash);
  return entry.payload;
};

const storePdfDownloadToken = async (tokenHash, payload) => {
  const ttlMs = Math.max(30 * 1000, PDF_DOWNLOAD_TOKEN_TTL_MS);
  const client = await getRedisClient();
  if (client) {
    try {
      const ttlSec = Math.max(1, Math.floor(ttlMs / 1000));
      await client.set(`pdfdl:${tokenHash}`, JSON.stringify(payload), { EX: ttlSec });
      return;
    } catch (err) {
      lastRedisErrorAt = Date.now();
    }
  }

  storePdfDownloadTokenInMemory(tokenHash, payload, ttlMs);
};

const consumePdfDownloadToken = async (token) => {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const client = await getRedisClient();
  if (client) {
    try {
      const key = `pdfdl:${tokenHash}`;
      const result = await client.multi().get(key).del(key).exec();
      const rawValue = result?.[0];
      const value = Array.isArray(rawValue) ? rawValue[1] : rawValue;
      if (!value) return null;
      return JSON.parse(value);
    } catch (err) {
      lastRedisErrorAt = Date.now();
    }
  }
  return consumePdfDownloadTokenInMemory(tokenHash);
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

const sendError = (res, status, code, message, req, options = {}) => {
  const requestId = req?.requestId ?? res.req?.requestId;
  const error = {
    code,
    message,
    requestId,
    ...(options.extra ?? {}),
  };

  if (!IS_PROD) {
    if (options.details) error.details = options.details;
    if (options.hint) error.hint = options.hint;
  }

  return res.status(status).json({ ok: false, error });
};

const sendRateLimit = (req, res, retryAfterSeconds) =>
  sendError(res, 429, "RATE_LIMIT", "Zu viele Anfragen.", req, {
    extra: { retryAfterSeconds },
  });

const sendSupabaseError = (res, err, req, fallback) => {
  const normalized = normalizeDbError(err);
  if (normalized) {
    return sendError(res, normalized.httpStatus, normalized.code, normalized.message, req, {
      details: err?.details,
      hint: err?.hint,
    });
  }

  return sendError(
    res,
    fallback?.status ?? 500,
    fallback?.code ?? err?.code ?? "DB_ERROR",
    fallback?.message ?? "Datenbankfehler.",
    req,
    {
      details: err?.details,
      hint: err?.hint,
    }
  );
};

const sendUnexpectedError = (res, err, req) => {
  logRequestError(req ?? res.req, err);
  return sendError(res, 500, "UNEXPECTED_ERROR", "Unerwarteter Serverfehler.", req);
};

const isValidEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const emailJsonParser = express.json({ limit: "9mb" });
const emailJsonErrorHandler = (err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return sendError(res, 413, "payload_too_large", "Payload too large.", req);
  }
  if (err?.type === "entity.parse.failed") {
    return sendError(res, 400, "invalid_json", "Invalid JSON payload.", req);
  }
  return next(err);
};

const emailRateLimitGuard = async (req, res, next) => {
  if (req.ip) {
    const result = await checkEmailRateLimit("ip", req.ip);
    if (!result.allowed) {
      return sendRateLimit(req, res, result.retryAfterSeconds);
    }
  }
  return next();
};

const getBearerToken = (req) => {
  const auth = req.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
};

const emailAuthGuard = async (req, res, next) => {
  const token = getBearerToken(req);
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
      return sendRateLimit(req, res, result.retryAfterSeconds);
    }
  }

  return next();
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
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
    logRequestError(req, err, "AUTH_ERROR");
    return sendError(res, 500, "auth_error", "Auth error.");
  }
};

const normalizeDbError = (err) => {
  const rawMessage = typeof err?.message === "string" ? err.message : "";
  const message = rawMessage.trim();
  const rawCode = typeof err?.code === "string" ? err.code : "";
  const code = rawCode.trim();
  const upperCode = code.toUpperCase();
  const upperMessage = message.toUpperCase();

  if (!code && !message) return null;

  const mapKnownCode = (mappedCode) => {
    switch (mappedCode) {
      case "NOT_AUTHENTICATED":
        return { code: mappedCode, message: "Bitte erneut anmelden.", httpStatus: 401 };
      case "FORBIDDEN":
        return { code: mappedCode, message: "Keine Berechtigung für diese Aktion.", httpStatus: 403 };
      case "INVOICE_LOCKED_CONTENT":
        return {
          code: mappedCode,
          message: "Diese Rechnung ist finalisiert und kann nicht geändert werden.",
          httpStatus: 409,
        };
      case "INVOICE_LOCK_INVALID_STATUS":
        return {
          code: mappedCode,
          message: "Der Rechnungsstatus erlaubt diese Aktion nicht.",
          httpStatus: 409,
        };
      case "INVOICE_NUMBER_IMMUTABLE":
        return {
          code: mappedCode,
          message: "Die Rechnungsnummer kann nach der Finalisierung nicht geändert werden.",
          httpStatus: 409,
        };
      case "STATUS_TRANSITION_NOT_ALLOWED":
        return { code: mappedCode, message: "Statuswechsel ist nicht erlaubt.", httpStatus: 400 };
      case "CLIENT_REQUIRED":
        return { code: mappedCode, message: "Bitte Kunde auswählen.", httpStatus: 400 };
      case "CLIENT_SNAPSHOT_MISSING":
        return { code: mappedCode, message: "Kundendaten fehlen für die Finalisierung.", httpStatus: 400 };
      case "POSITIONS_REQUIRED":
        return { code: mappedCode, message: "Bitte mindestens eine Position hinzufügen.", httpStatus: 400 };
      case "SERVICE_DATE_REQUIRED":
        return { code: mappedCode, message: "Bitte genau ein Leistungsdatum oder einen vollständigen Leistungszeitraum angeben.", httpStatus: 400 };
      case "SERVICE_PERIOD_INVALID":
        return { code: mappedCode, message: "Der Leistungszeitraum ist ungültig.", httpStatus: 400 };
      case "UNSUPPORTED_MARKET_SCOPE":
        return { code: mappedCode, message: "Unterstützt werden derzeit nur inländische B2B-Rechnungen deutscher Unternehmen in EUR.", httpStatus: 422 };
      case "UNSUPPORTED_TAX_CASE":
        return { code: mappedCode, message: "Dieser Steuerfall wird derzeit nicht unterstützt.", httpStatus: 422 };
      case "SELLER_TAX_IDENTIFICATION_REQUIRED":
        return { code: mappedCode, message: "Bitte Steuernummer oder USt-ID hinterlegen.", httpStatus: 400 };
      case "UNIQUE_VIOLATION":
        return { code: mappedCode, message: "Ein Eintrag mit diesen Daten existiert bereits.", httpStatus: 409 };
      case "FOREIGN_KEY_VIOLATION":
        return { code: mappedCode, message: "Verknüpfte Daten fehlen oder sind ungültig.", httpStatus: 400 };
      case "INVALID_INPUT":
        return { code: mappedCode, message: "Ungültige Eingabe.", httpStatus: 400 };
      case "CHECK_VIOLATION":
        return { code: mappedCode, message: "Ungültige Eingabe.", httpStatus: 400 };
      default:
        return null;
    }
  };

  const directCode = mapKnownCode(upperCode);
  if (directCode) return directCode;

  switch (upperCode) {
    case "23505":
      return mapKnownCode("UNIQUE_VIOLATION");
    case "23503":
      return mapKnownCode("FOREIGN_KEY_VIOLATION");
    case "22P02":
      return mapKnownCode("INVALID_INPUT");
    case "23514":
      if (upperMessage.includes("STATUS_TRANSITION_NOT_ALLOWED") || upperMessage.includes("STATUS TRANSITION")) {
        return mapKnownCode("STATUS_TRANSITION_NOT_ALLOWED");
      }
      return mapKnownCode("CHECK_VIOLATION");
    case "P0001":
      if (upperMessage.includes("NOT_AUTHENTICATED")) return mapKnownCode("NOT_AUTHENTICATED");
      if (upperMessage.includes("FORBIDDEN")) return mapKnownCode("FORBIDDEN");
      if (upperMessage.includes("INVOICE_LOCKED_CONTENT")) return mapKnownCode("INVOICE_LOCKED_CONTENT");
      if (upperMessage.includes("INVOICE_LOCK_INVALID_STATUS")) return mapKnownCode("INVOICE_LOCK_INVALID_STATUS");
      if (upperMessage.includes("INVOICE_NUMBER_IMMUTABLE")) return mapKnownCode("INVOICE_NUMBER_IMMUTABLE");
      if (upperMessage.includes("STATUS_TRANSITION_NOT_ALLOWED") || upperMessage.includes("STATUS TRANSITION")) {
        return mapKnownCode("STATUS_TRANSITION_NOT_ALLOWED");
      }
      if (upperMessage.includes("CLIENT_REQUIRED")) return mapKnownCode("CLIENT_REQUIRED");
      if (upperMessage.includes("CLIENT_SNAPSHOT_MISSING")) return mapKnownCode("CLIENT_SNAPSHOT_MISSING");
      if (upperMessage.includes("POSITIONS_REQUIRED")) return mapKnownCode("POSITIONS_REQUIRED");
      for (const known of ["SERVICE_DATE_REQUIRED", "SERVICE_PERIOD_INVALID", "UNSUPPORTED_MARKET_SCOPE", "UNSUPPORTED_TAX_CASE", "SELLER_TAX_IDENTIFICATION_REQUIRED"]) {
        if (upperMessage.includes(known)) return mapKnownCode(known);
      }
      return {
        code: "DB_ERROR",
        message: message || "Datenbankfehler.",
        httpStatus: 500,
      };
    default:
      return null;
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
    from: FROM_HEADER,
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
  number: row.invoice_number ?? row.number ?? null,
  clientId: row.client_id,
  clientName: row.client_name ?? "",
  clientCompanyName: row.client_company_name ?? "",
  clientContactPerson: row.client_contact_person ?? "",
  clientEmail: row.client_email ?? "",
  clientPhone: row.client_phone ?? "",
  clientVatId: row.client_vat_id ?? "",
  clientAddress: row.client_address ?? "",
  clientStreet: row.client_street ?? "", clientHouseNumber: row.client_house_number ?? "", clientPostalCode: row.client_postal_code ?? "", clientCity: row.client_city ?? "", clientElectronicAddress: row.client_electronic_address ?? "", clientElectronicAddressScheme: row.client_electronic_address_scheme ?? "EM",
  projectId: row.project_id ?? undefined,
  date: row.invoice_date ?? row.date,
  serviceDate: row.service_date ?? "",
  servicePeriodStart: row.service_period_start ?? "",
  servicePeriodEnd: row.service_period_end ?? "",
  sellerCountry: row.seller_country ?? "",
  customerCountry: row.customer_country ?? "",
  customerType: row.customer_type ?? "",
  serviceCountry: row.service_country ?? "",
  buyerReference: row.buyer_reference ?? "",
  currency: row.currency ?? "EUR",
  dueDate: row.due_date ?? "",
  paymentTermsDays: row.payment_terms_days ?? 14,
  positions: row.positions ?? [],
  introText: row.intro_text ?? "",
  footerText: row.footer_text ?? "",
  vatRate: Number(row.vat_rate ?? 0),
  isSmallBusiness: Boolean(row.is_small_business ?? false),
  smallBusinessNote: row.small_business_note ?? null,
  status: row.status ?? "DRAFT",
  finalizedAt: row.finalized_at ?? null,
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
  status: row.status ?? "DRAFT",
  rejectionReason: row.rejection_reason ?? null,
});

const mapSettingsRow = (row = {}) => ({
  companyName: row.company_name ?? "",
  address: row.address ?? "",
  taxId: row.tax_id ?? "",
  sellerTaxNumber: row.seller_tax_number ?? row.tax_id ?? "",
  sellerVatId: row.seller_vat_id ?? "",
  sellerCountry: row.seller_country ?? "",
  sellerStreet: row.seller_street ?? "", sellerHouseNumber: row.seller_house_number ?? "", sellerPostalCode: row.seller_postal_code ?? "", sellerCity: row.seller_city ?? "", sellerElectronicAddress: row.seller_electronic_address ?? "", sellerElectronicAddressScheme: row.seller_electronic_address_scheme ?? "EM",
  iban: row.iban ?? "",
  bic: row.bic ?? "",
  bankName: row.bank_name ?? "",
  footerText: row.footer_text ?? "",
  logoUrl: row.logo_url ?? "",
  primaryColor: row.primary_color ?? "#4f46e5",
  templateId: row.template_id === "default" ? "classic" : row.template_id ?? "classic",
  locale: row.locale ?? "de-DE",
  currency: row.currency ?? "EUR",
});

const loadLogoDataUrl = async (db, logoPath) => {
  if (!logoPath || !db?.storage) return "";
  try {
    const { data, error } = await db.storage.from("company-assets").download(logoPath);
    if (error || !data) return "";
    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) return "";
    const contentType = data.type && ["image/png", "image/jpeg", "image/webp"].includes(data.type)
      ? data.type
      : "image/png";
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return "";
  }
};

const assertInvoiceFinalizedForEinvoice = (doc) => {
  if (doc?.finalizedAt) return;
  const error = new Error("Only finalized invoices can be exported as electronic invoices");
  error.status = 409;
  error.code = "EINVOICE_NOT_FINALIZED";
  throw error;
};

const mapInvoiceSnapshotClient = (row = {}) => ({
  id: row.client_id ?? "",
  companyName: row.client_company_name ?? row.client_name ?? "",
  name: row.client_name ?? row.client_company_name ?? "",
  contactPerson: row.client_contact_person ?? "",
  email: row.client_email ?? "",
  address: row.client_address ?? "",
  vatId: row.client_vat_id ?? "",
  phone: row.client_phone ?? "",
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
    ? "id, user_id, invoice_number, number, client_id, client_name, client_company_name, client_contact_person, client_email, client_phone, client_vat_id, client_address, client_street, client_house_number, client_postal_code, client_city, client_electronic_address, client_electronic_address_scheme, project_id, date, invoice_date, service_date, service_period_start, service_period_end, seller_country, customer_country, customer_type, service_country, buyer_reference, currency, payment_terms_days, due_date, positions, intro_text, footer_text, vat_rate, is_small_business, small_business_note, branding_snapshot, status, finalized_at"
    : "id, user_id, number, client_id, project_id, date, valid_until, positions, intro_text, footer_text, vat_rate, status, rejection_reason, updated_at";

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
    .select("company_name, address, tax_id, seller_tax_number, seller_vat_id, seller_country, seller_street, seller_house_number, seller_postal_code, seller_city, seller_electronic_address, seller_electronic_address_scheme, iban, bic, bank_name, footer_text, logo_url, primary_color, template_id, locale, currency")
    .eq("user_id", userId)
    .maybeSingle();

  const currentSettings = mapSettingsRow(settingsRow ?? {});
  const snapshot = resolvedType === "invoice" && docRow.branding_snapshot && typeof docRow.branding_snapshot === "object"
    ? docRow.branding_snapshot
    : null;
  const settings = snapshot ? { ...currentSettings, ...snapshot } : currentSettings;
  settings.logoDataUrl = await loadLogoDataUrl(db, settings.logoUrl);

  let client = mapClientRow({});
  if (resolvedType === "invoice") {
    const snapshotClient = mapInvoiceSnapshotClient(docRow);
    const hasSnapshot = [
      snapshotClient.companyName,
      snapshotClient.name,
      snapshotClient.contactPerson,
      snapshotClient.email,
      snapshotClient.address,
    ].some((value) => String(value ?? "").trim().length > 0);
    if (hasSnapshot) {
      client = snapshotClient;
    }
  }

  if (!client.companyName && !client.name && doc.clientId) {
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

const createPdfBufferFromPayload = async (type, payload, options = {}) => {
  const requestId = options.requestId ?? null;
  const source = options.source ?? "unknown";
  logEvent("info", "pdf_generate_attempt", { requestId, source, type });
  const canonicalInvoice = type === "invoice" ? buildCanonicalInvoice(payload ?? {}) : null;
  const renderPayload = type === "invoice"
    ? canonicalInvoiceToRenderPayload(canonicalInvoice, payload ?? {})
    : { doc: payload?.doc ?? {}, settings: payload?.settings ?? {}, client: payload?.client ?? {} };
  if (type === "invoice" && renderPayload.settings?.iban) {
    renderPayload.settings.paymentQrDataUrl = await createEpcQrDataUrl({
      beneficiary: renderPayload.settings.companyName,
      iban: renderPayload.settings.iban,
      bic: renderPayload.settings.bic,
      amount: canonicalInvoice.totals.grossTotal,
      reference: `Rechnung ${renderPayload.doc.number ?? ""}`.trim(),
    });
  }
  const html = renderDocumentHtml({ type, ...renderPayload });

  if (process.env.PDF_TEST_MODE === "1") {
    return Buffer.from(html, "utf8");
  }

  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1200, height: 2000 } });
  let page;

  try {
    page = await context.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });

    return pdfBuffer;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (err) {
        // ignore close errors
      }
    }
    try {
      await context.close();
    } catch (err) {
      // ignore close errors
    }
  }
};

const createPdfAttachment = async ({ type, payload, requestId, source }) => {
  const buffer = await createPdfBufferFromPayload(type, payload, { requestId, source });
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

app.get("/api/positions/suggestions", requireAuth, async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200) : "";
    const customerId = typeof req.query.customerId === "string" && /^[0-9a-f-]{36}$/i.test(req.query.customerId) ? req.query.customerId : null;
    if (query.length < 2) return res.json({ suggestions: [] });
    const db = createUserSupabaseClient(getBearerToken(req));
    const [templateResult, invoiceResult, offerResult, eventResult] = await Promise.all([
      db.from("position_templates").select("id,kind,name,description,category,unit,default_quantity,default_unit_price,tax_category,tax_rate,product_number,manufacturer,image_url,usage_count,last_used_at").limit(100),
      db.from("invoices").select("id,client_id,positions,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      db.from("offers").select("id,client_id,positions,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      db.from("position_suggestion_events").select("suggestion_id,action,created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    const error = templateResult.error || invoiceResult.error || offerResult.error || eventResult.error;
    if (error) throw error;
    const suggestions = rankPositionSuggestions({
      query,
      customerId,
      templates: templateResult.data ?? [],
      invoices: invoiceResult.data ?? [],
      offers: offerResult.data ?? [],
      events: eventResult.data ?? [],
    });
    return res.json({ suggestions });
  } catch (error) {
    logRequestError(req, error, "POSITION_SUGGESTIONS_FAILED");
    return sendError(res, 500, "POSITION_SUGGESTIONS_FAILED", "Positionsvorschläge konnten nicht geladen werden.", req);
  }
});

app.get("/api/positions/templates", requireAuth, async (req, res) => {
  try {
    const db = createUserSupabaseClient(getBearerToken(req));
    const { data, error } = await db.from("position_templates").select("*").order("name");
    if (error) throw error;
    return res.json({ templates: data ?? [] });
  } catch (error) {
    logRequestError(req, error, "POSITION_TEMPLATES_FAILED");
    return sendError(res, 500, "POSITION_TEMPLATES_FAILED", "Positionskatalog konnte nicht geladen werden.", req);
  }
});

app.post("/api/positions/templates", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const kind = ["PRODUCT", "SERVICE", "TEMPLATE"].includes(body.kind) ? body.kind : "SERVICE";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const taxCategory = ["STANDARD", "REDUCED", "ZERO", "EXEMPT", "SMALL_BUSINESS", "REVERSE_CHARGE"].includes(body.taxCategory) ? body.taxCategory : "STANDARD";
    const taxRate = Number(body.taxRate);
    const price = body.defaultUnitPrice === null || body.defaultUnitPrice === "" ? null : Number(body.defaultUnitPrice);
    if (!name || name.length > 200 || !unit || unit.length > 30 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 || (price !== null && (!Number.isFinite(price) || price < 0))) {
      return sendError(res, 400, "POSITION_TEMPLATE_INVALID", "Bitte prüfe Bezeichnung, Einheit, Preis und Steuer.", req);
    }
    const db = createUserSupabaseClient(getBearerToken(req));
    const { data, error } = await db.from("position_templates").insert({
      user_id: req.user.id, kind, name, unit,
      description: String(body.description ?? "").trim().slice(0, 2000),
      category: String(body.category ?? "").trim().slice(0, 100),
      default_quantity: Number(body.defaultQuantity) > 0 ? Number(body.defaultQuantity) : 1,
      default_unit_price: price, tax_category: taxCategory, tax_rate: taxRate,
      product_number: body.productNumber ? String(body.productNumber).trim().slice(0, 100) : null,
      manufacturer: body.manufacturer ? String(body.manufacturer).trim().slice(0, 200) : null,
      image_url: body.imageUrl ? String(body.imageUrl).trim().slice(0, 2000) : null,
    }).select("*").single();
    if (error) throw error;
    return res.status(201).json({ template: data });
  } catch (error) {
    logRequestError(req, error, "POSITION_TEMPLATE_SAVE_FAILED");
    return sendError(res, 500, "POSITION_TEMPLATE_SAVE_FAILED", "Position konnte nicht gespeichert werden.", req);
  }
});

app.delete("/api/positions/templates/:id", requireAuth, async (req, res) => {
  try {
    const db = createUserSupabaseClient(getBearerToken(req));
    const { error } = await db.from("position_templates").delete().eq("id", req.params.id);
    if (error) throw error;
    return res.status(204).end();
  } catch (error) {
    logRequestError(req, error, "POSITION_TEMPLATE_DELETE_FAILED");
    return sendError(res, 500, "POSITION_TEMPLATE_DELETE_FAILED", "Position konnte nicht gelöscht werden.", req);
  }
});

app.get("/api/positions/groups", requireAuth, async (req, res) => {
  try {
    const db = createUserSupabaseClient(getBearerToken(req));
    const { data, error } = await db.from("position_groups").select("*, position_group_items(*)").order("name");
    if (error) throw error;
    return res.json({ groups: (data ?? []).map((group) => ({ ...group, position_group_items: [...(group.position_group_items ?? [])].sort((a, b) => a.sort_order - b.sort_order) })) });
  } catch (error) {
    logRequestError(req, error, "POSITION_GROUPS_FAILED");
    return sendError(res, 500, "POSITION_GROUPS_FAILED", "Positionsgruppen konnten nicht geladen werden.", req);
  }
});

app.post("/api/positions/groups", requireAuth, async (req, res) => {
  const db = createUserSupabaseClient(getBearerToken(req));
  let groupId = null;
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
    if (!name || name.length > 200 || items.length === 0) return sendError(res, 400, "POSITION_GROUP_INVALID", "Gruppenname und mindestens eine Position sind erforderlich.", req);
    const { data: group, error: groupError } = await db.from("position_groups").insert({ user_id: req.user.id, name, description: String(req.body.description ?? "").slice(0, 2000), category: String(req.body.category ?? "").slice(0, 100) }).select("*").single();
    if (groupError) throw groupError;
    groupId = group.id;
    const rows = items.map((item, index) => ({ user_id: req.user.id, position_group_id: group.id, position_template_id: item.positionTemplateId ?? null, title: String(item.title ?? "").trim().slice(0, 200), description: String(item.description ?? "").slice(0, 2000), quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1, unit: String(item.unit ?? "Stk").slice(0, 30), unit_price: item.unitPrice === null || item.unitPrice === "" ? null : Number(item.unitPrice), tax_category: ["STANDARD", "REDUCED", "ZERO", "EXEMPT", "SMALL_BUSINESS", "REVERSE_CHARGE"].includes(item.taxCategory) ? item.taxCategory : "STANDARD", tax_rate: Number.isFinite(Number(item.taxRate)) ? Number(item.taxRate) : 19, sort_order: index, optional: Boolean(item.optional) }));
    if (rows.some((row) => !row.title || row.quantity <= 0 || row.unit_price !== null && (!Number.isFinite(row.unit_price) || row.unit_price < 0))) throw Object.assign(new Error("Invalid group item"), { status: 400, code: "POSITION_GROUP_INVALID" });
    const { error: itemError } = await db.from("position_group_items").insert(rows);
    if (itemError) throw itemError;
    return res.status(201).json({ group: { ...group, position_group_items: rows } });
  } catch (error) {
    if (groupId) await db.from("position_groups").delete().eq("id", groupId);
    logRequestError(req, error, "POSITION_GROUP_SAVE_FAILED");
    return sendError(res, error?.status ?? 500, error?.code ?? "POSITION_GROUP_SAVE_FAILED", error?.status === 400 ? "Bitte prüfe die Positionen der Gruppe." : "Positionsgruppe konnte nicht gespeichert werden.", req);
  }
});

app.delete("/api/positions/groups/:id", requireAuth, async (req, res) => {
  try {
    const db = createUserSupabaseClient(getBearerToken(req));
    const { error } = await db.from("position_groups").delete().eq("id", req.params.id);
    if (error) throw error;
    return res.status(204).end();
  } catch (error) {
    logRequestError(req, error, "POSITION_GROUP_DELETE_FAILED");
    return sendError(res, 500, "POSITION_GROUP_DELETE_FAILED", "Positionsgruppe konnte nicht gelöscht werden.", req);
  }
});

app.post("/api/positions/suggestion-events", requireAuth, async (req, res) => {
  try {
    const allowedTypes = new Set(["PRODUCT", "SERVICE", "TEMPLATE", "HISTORY", "AI", "GROUP"]);
    const allowedActions = new Set(["SHOWN", "SELECTED", "DISCARDED", "APPLIED", "EDITED", "PRICE_CHANGED"]);
    const body = req.body ?? {};
    if (!allowedTypes.has(body.suggestionType) || !allowedActions.has(body.action)) {
      return sendError(res, 400, "POSITION_EVENT_INVALID", "Ungültiges Positionsereignis.", req);
    }
    const db = createUserSupabaseClient(getBearerToken(req));
    const { error } = await db.from("position_suggestion_events").insert({
      user_id: req.user.id,
      customer_id: typeof body.customerId === "string" ? body.customerId : null,
      document_type: body.documentType === "offer" ? "offer" : "invoice",
      query: String(body.query ?? "").slice(0, 500),
      suggestion_type: body.suggestionType,
      suggestion_id: body.suggestionId ? String(body.suggestionId).slice(0, 200) : null,
      action: body.action,
      original_value: body.originalValue ?? null,
      final_value: body.finalValue ?? null,
    });
    if (error) throw error;
    return res.status(204).end();
  } catch (error) {
    logRequestError(req, error, "POSITION_EVENT_FAILED");
    return sendError(res, 500, "POSITION_EVENT_FAILED", "Positionsereignis konnte nicht gespeichert werden.", req);
  }
});

app.post("/api/ai/invoice-draft", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`ai_user_${req.user.id}`, 20);
    if (req.ip) checkRateLimit(`ai_ip_${req.ip}`, 60);

    const db = requireSupabase();
    const plan = await requireEntitlement(db, req.user.id, "AI_DRAFT");
    await incrementUsage(db, req.user.id, plan, "AI_DRAFT");
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const documentType = req.body?.documentType;
    if (!description) return sendError(res, 400, "AI_INPUT_REQUIRED", "Bitte beschreibe die gewünschten Leistungen.", req);
    if (description.length > 4000) return sendError(res, 400, "AI_INPUT_TOO_LONG", "Die Beschreibung darf höchstens 4.000 Zeichen enthalten.", req);
    if (documentType !== "invoice" && documentType !== "offer") {
      return sendError(res, 400, "AI_INVALID_DOCUMENT_TYPE", "Ungültiger Dokumenttyp.", req);
    }

    const currency = typeof req.body?.currency === "string" && /^[A-Z]{3}$/.test(req.body.currency)
      ? req.body.currency
      : "EUR";
    const vatRate = Number.isFinite(Number(req.body?.vatRate)) ? Number(req.body.vatRate) : 0;
    const customerId = typeof req.body?.customerId === "string" && /^[0-9a-f-]{36}$/i.test(req.body.customerId) ? req.body.customerId : null;
    const userDb = createUserSupabaseClient(getBearerToken(req));
    const [templateResult, invoiceResult, offerResult] = await Promise.all([
      userDb.from("position_templates").select("id,kind,name,description,category,unit,default_quantity,default_unit_price,tax_category,tax_rate,product_number,manufacturer,image_url").limit(100),
      userDb.from("invoices").select("id,client_id,positions,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      userDb.from("offers").select("id,client_id,positions,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
    ]);
    const contextError = templateResult.error || invoiceResult.error || offerResult.error;
    if (contextError) throw contextError;
    const priceCandidates = rankPositionSuggestions({
      query: description,
      customerId,
      templates: templateResult.data ?? [],
      invoices: invoiceResult.data ?? [],
      offers: offerResult.data ?? [],
      limit: 20,
    });
    const draft = await generateInvoiceDraft({
      description,
      documentType,
      currency,
      vatRate,
      userId: req.user.id,
      priceCandidates,
    });
    return res.json({ draft });
  } catch (error) {
    const requestId = req.requestId;
    logRequestError(req, error, error?.code || "AI_INVOICE_DRAFT_FAILED");
    if (["PLAN_REQUIRED", "FEATURE_NOT_INCLUDED", "USAGE_LIMIT_REACHED"].includes(error?.code)) return sendError(res, error.status, error.code, error.code === "USAGE_LIMIT_REACHED" ? "Dein KI-Kontingent für diesen Monat ist aufgebraucht." : "Diese KI-Funktion ist in deinem Tarif nicht enthalten.", req);
    if (error?.status === 429) return sendError(res, 429, "RATE_LIMIT", "Zu viele KI-Anfragen. Bitte versuche es später erneut.", req);
    if (error?.code === "AI_NOT_CONFIGURED") return sendError(res, 503, error.code, "KI-Funktion ist nicht konfiguriert.", req);
    if (error?.code === "AI_MODEL_NOT_CONFIGURED") return sendError(res, 503, error.code, "KI-Modell ist nicht konfiguriert.", req);
    if (error?.code === "AI_INVALID_RESPONSE" || error?.name === "ZodError") {
      return sendError(res, 502, "AI_INVALID_RESPONSE", "Der KI-Vorschlag hatte ein ungültiges Format.", req);
    }
    return sendError(res, 502, "AI_GENERATION_FAILED", "KI-Vorschlag konnte nicht erstellt werden.", req);
  }
});

app.post("/api/ai/business-card", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`ai_card_user_${req.user.id}`, 12);
    if (req.ip) checkRateLimit(`ai_card_ip_${req.ip}`, 30);
    const db = requireSupabase();
    const plan = await requireEntitlement(db, req.user.id, "AI_DRAFT");
    await incrementUsage(db, req.user.id, plan, "AI_DRAFT");
    const contact = await extractBusinessCard({ imageDataUrl: req.body?.imageDataUrl, userId: req.user.id });
    return res.json({ contact });
  } catch (error) {
    logRequestError(req, error, error?.code || "AI_BUSINESS_CARD_FAILED");
    if (["PLAN_REQUIRED", "FEATURE_NOT_INCLUDED", "USAGE_LIMIT_REACHED"].includes(error?.code)) return sendError(res, error.status, error.code, error.code === "USAGE_LIMIT_REACHED" ? "Dein KI-Kontingent für diesen Monat ist aufgebraucht." : "Diese KI-Funktion ist in deinem Tarif nicht enthalten.", req);
    if (error?.status === 429) return sendError(res, 429, "RATE_LIMIT", "Zu viele Scan-Anfragen. Bitte versuche es später erneut.", req);
    if (error?.code === "AI_CARD_INVALID_IMAGE") return sendError(res, 400, error.code, "Bitte verwende ein JPEG-, PNG- oder WebP-Bild.", req);
    if (error?.code === "AI_CARD_IMAGE_SIZE") return sendError(res, 413, error.code, "Das Bild ist zu groß oder ungültig.", req);
    if (error?.code === "AI_NOT_CONFIGURED" || error?.code === "AI_MODEL_NOT_CONFIGURED") return sendError(res, 503, error.code, "KI-Funktion ist nicht konfiguriert.", req);
    if (error?.code === "AI_INVALID_RESPONSE" || error?.name === "ZodError") return sendError(res, 502, "AI_INVALID_RESPONSE", "Die Kontaktdaten konnten nicht sicher erkannt werden.", req);
    return sendError(res, 502, "AI_CARD_FAILED", "Visitenkarte konnte nicht analysiert werden.", req);
  }
});

app.post("/api/pdf", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`pdf_user_${req.user.id}`, 60);
    if (req.ip) checkRateLimit(`pdf_ip_${req.ip}`, 120);

    const docId = req.body?.docId ?? req.body?.documentId ?? null;
    const type = normalizeDocType(req.body?.type ?? req.body?.documentType);
    if (!docId || !type) {
      return sendError(res, 400, "VALIDATION_ERROR", "Missing required fields: docId, type", req);
    }

    const payload = await loadDocumentPayloadFromDb({
      type,
      docId,
      userId: req.user.id,
    });

    enforceLegacyPayloadMatch(req.body, payload);

    const { buffer, filename } = await createPdfAttachment({
      type,
      payload,
      requestId: req.requestId,
      source: "api_pdf",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.status(200).send(buffer);
  } catch (err) {
    const status = err?.status || 500;
    const code = err?.code || "pdf_generation_failed";
    logRequestError(req, err, code);
    return sendError(res, status, code, "PDF generation failed.", req);
  }
});

app.post("/api/einvoice/cii", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`einvoice_user_${req.user.id}`, 60);
    const docId = req.body?.docId ?? null;
    if (!docId) return sendError(res, 400, "VALIDATION_ERROR", "Missing required field: docId", req);
    const payload = await loadDocumentPayloadFromDb({ type: "invoice", docId, userId: req.user.id });
    assertInvoiceFinalizedForEinvoice(payload.doc);
    const invoice = buildCanonicalInvoice(payload);
    const cii = serializeCanonicalInvoiceToCii(invoice).replace("urn:factur-x.eu:1p0:en16931", "urn:cen.eu:en16931:2017");
    const contentHash = crypto.createHash("sha256").update(cii, "utf8").digest("hex");
    const generatedAt = new Date().toISOString();
    const { error: archiveError } = await requireSupabase().from("einvoice_exports").insert({
      user_id: req.user.id,
      invoice_id: docId,
      format: "CII_XML",
      profile: "EN16931",
      version: "ZUGFeRD_2",
      status: "GENERATED",
      validation_result: { preflight: "passed" },
      generated_at: generatedAt,
      content_hash: contentHash,
    });
    if (archiveError) {
      const archiveFailure = new Error("E-invoice export metadata could not be archived");
      archiveFailure.code = "EINVOICE_GENERATION_FAILED";
      archiveFailure.status = 500;
      throw archiveFailure;
    }
    const filename = `Rechnung_${sanitizeFilename(invoice.invoiceNumber || docId)}.xml`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(cii);
  } catch (err) {
    logRequestError(req, err, err?.code || "CII_GENERATION_FAILED");
    return sendError(res, err?.status || 500, err?.code || "CII_GENERATION_FAILED", err?.code === "CII_PREFLIGHT_FAILED" ? "Die Rechnung enthält noch unvollständige oder nicht unterstützte E-Rechnungsdaten." : "CII-XML konnte nicht erstellt werden.", req, { extra: !IS_PROD && err?.issues ? { issues: err.issues } : undefined });
  }
});

app.post("/api/einvoice/zugferd", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`einvoice_user_${req.user.id}`, 20);
    await requireEntitlement(requireSupabase(), req.user.id, "EINVOICE_EXPORT");
    const docId = req.body?.docId ?? null;
    if (!docId) return sendError(res, 400, "VALIDATION_ERROR", "Missing required field: docId", req);

    const payload = await loadDocumentPayloadFromDb({ type: "invoice", docId, userId: req.user.id });
    assertInvoiceFinalizedForEinvoice(payload.doc);
    const invoice = buildCanonicalInvoice(payload);
    const cii = serializeCanonicalInvoiceToCii(invoice).replace("urn:factur-x.eu:1p0:en16931", "urn:cen.eu:en16931:2017");
    const visualPdf = await createPdfBufferFromPayload("invoice", payload, { requestId: req.requestId, source: "einvoice" });
    const generated = await generateValidatedZugferd({ requestId: req.requestId, visualPdf, ciiXml: cii });
    const generatedAt = new Date().toISOString();

    const { error: archiveError } = await requireSupabase().from("einvoice_exports").insert({
      user_id: req.user.id,
      invoice_id: docId,
      format: "ZUGFERD_PDF",
      profile: "EN16931",
      version: "ZUGFeRD_2",
      status: "GENERATED",
      validation_result: generated.validationResult,
      generated_at: generatedAt,
      content_hash: generated.contentHash,
    });
    if (archiveError) {
      const error = new Error("E-invoice export metadata could not be archived");
      error.code = "EINVOICE_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }

    const filename = `Rechnung_${sanitizeFilename(invoice.invoiceNumber || docId)}_ZUGFeRD.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Content-SHA256", generated.contentHash);
    return res.status(200).send(generated.pdf);
  } catch (err) {
    logRequestError(req, err, err?.code || "EINVOICE_GENERATION_FAILED");
    const code = err?.status === 404 ? "EINVOICE_FORBIDDEN" : err?.code === "CII_PREFLIGHT_FAILED" ? "EINVOICE_DATA_INCOMPLETE" : err?.code || "EINVOICE_GENERATION_FAILED";
    const message = code === "EINVOICE_NOT_FINALIZED" ? "Nur finalisierte Rechnungen können als E-Rechnung exportiert werden." : code === "EINVOICE_DATA_INCOMPLETE" ? "Für diese Rechnung fehlen strukturierte E-Rechnungsdaten." : code === "EINVOICE_VALIDATION_FAILED" ? "Die Rechnung hat die E-Rechnungsvalidierung nicht bestanden." : code === "EINVOICE_GENERATOR_NOT_CONFIGURED" ? "Der E-Rechnungsdienst ist noch nicht konfiguriert." : code === "EINVOICE_FORBIDDEN" ? "Diese E-Rechnung ist nicht verfügbar." : "Die E-Rechnung konnte nicht erzeugt werden.";
    return sendError(res, err?.status || 500, code, message, req, { extra: !IS_PROD && err?.issues ? { issues: err.issues } : undefined });
  }
});

app.post("/api/account/export", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`account_export_${req.user.id}`, 3);
    const datasets = await loadOwnedAccountData(requireSupabase(), req.user.id);
    const archive = buildAccountExportZip({ user: req.user, datasets });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="FreelanceFlow_Datenexport_${date}.zip"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(archive);
  } catch (err) {
    logRequestError(req, err, err?.code || "DATA_EXPORT_FAILED");
    return sendError(res, err?.status || 500, err?.code || "DATA_EXPORT_FAILED", "Der Datenexport konnte nicht erstellt werden.", req);
  }
});

app.post("/api/account/deletion-request", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`account_deletion_${req.user.id}`, 5);
    const password = String(req.body?.password ?? "");
    const confirmation = String(req.body?.confirmation ?? "");
    if (confirmation !== "LÖSCHEN" || !password) {
      return sendError(res, 400, "ACCOUNT_DELETION_CONFIRMATION_REQUIRED", "Bitte bestätige die Löschung mit deinem Passwort und dem Wort LÖSCHEN.", req);
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !req.user.email) {
      return sendError(res, 500, "ACCOUNT_DELETION_FAILED", "Die Accountlöschung ist nicht konfiguriert.", req);
    }

    const verificationClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: verificationError } = await verificationClient.auth.signInWithPassword({ email: req.user.email, password });
    if (verificationError) {
      return sendError(res, 403, "ACCOUNT_REAUTHENTICATION_FAILED", "Das Passwort konnte nicht bestätigt werden.", req);
    }

    const db = requireSupabase();
    const { data: existing } = await db.from("account_deletion_requests").select("id,status,scheduled_for").eq("user_id", req.user.id).in("status", ["REQUESTED", "COOLING_OFF", "CLAIMED", "PROCESSING", "BLOCKED_PENDING_REVIEW"]).maybeSingle();
    if (existing) {
      return res.status(200).json({ request: existing, alreadyRequested: true });
    }
    const { data: request, error: insertError } = await db.from("account_deletion_requests").insert({ user_id: req.user.id, status: "COOLING_OFF" }).select("id,status,requested_at,scheduled_for").single();
    if (insertError) throw Object.assign(new Error("Deletion request insert failed"), { code: "ACCOUNT_DELETION_FAILED", status: 500 });

    const token = getBearerToken(req);
    if (token) await db.auth.admin.signOut(token, "global");
    return res.status(202).json({ request, alreadyRequested: false });
  } catch (err) {
    logRequestError(req, err, err?.code || "ACCOUNT_DELETION_FAILED");
    return sendError(res, err?.status || 500, err?.code || "ACCOUNT_DELETION_FAILED", "Der Löschauftrag konnte nicht erstellt werden.", req);
  }
});

app.post("/api/beta/feedback", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`beta_feedback_${req.user.id}`, 10, 60 * 60 * 1000);
    const category = String(req.body?.category ?? "");
    const message = String(req.body?.message ?? "").trim();
    const route = String(req.body?.route ?? "").slice(0, 300);
    const relatedRequestId = req.body?.requestId ? String(req.body.requestId).slice(0, 100) : null;
    if (!["BUG", "UNDERSTANDING", "FEATURE_REQUEST"].includes(category) || message.length < 3 || message.length > 4000 || !route.startsWith("/")) return sendError(res, 400, "BETA_FEEDBACK_INVALID", "Bitte fülle Kategorie und Beschreibung vollständig aus.", req);
    const { error } = await requireSupabase().from("beta_feedback").insert({ user_id: req.user.id, category, message, route, request_id: relatedRequestId });
    if (error) throw error;
    return res.status(201).json({ ok: true });
  } catch (err) {
    logRequestError(req, err, err?.code || "BETA_FEEDBACK_FAILED");
    return sendError(res, err?.status || 500, err?.code || "BETA_FEEDBACK_FAILED", "Feedback konnte nicht gesendet werden.", req);
  }
});

app.get("/api/account/deletion-status", requireAuth, async (req, res) => {
  const { data, error } = await requireSupabase().from("account_deletion_requests").select("id,status,requested_at,scheduled_for,completed_at,canceled_at,blocked_reason_code").eq("user_id", req.user.id).order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return sendSupabaseError(res, error, req, { code: "ACCOUNT_DELETION_STATUS_FAILED", message: "Löschstatus konnte nicht geladen werden." });
  return res.json({ request: data ?? null });
});

app.post("/api/account/deletion-cancel", requireAuth, async (req, res) => {
  const now = new Date().toISOString();
  const { data, error } = await requireSupabase().from("account_deletion_requests").update({ status: "CANCELED", canceled_at: now, updated_at: now }).eq("user_id", req.user.id).in("status", ["REQUESTED", "COOLING_OFF"]).select("id,status,canceled_at").maybeSingle();
  if (error) return sendSupabaseError(res, error, req, { code: "ACCOUNT_DELETION_CANCEL_FAILED", message: "Löschauftrag konnte nicht widerrufen werden." });
  if (!data) return sendError(res, 409, "ACCOUNT_DELETION_NOT_CANCELABLE", "Der Löschauftrag kann nicht mehr widerrufen werden.", req);
  return res.json({ request: data });
});

app.get("/api/internal/account-deletions/process", async (req, res) => {
  try {
    const providedSecret = String(req.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!verifyWorkerSecret(providedSecret, process.env.CRON_SECRET)) {
      return sendError(res, 401, "WORKER_UNAUTHORIZED", "Nicht autorisiert.", req);
    }
    const result = await processDueAccountDeletions({
      supabase: requireSupabase(),
      policyVersion: process.env.ACCOUNT_DELETION_RETENTION_POLICY,
      limit: 10,
    });
    return res.status(200).json(result);
  } catch (err) {
    logRequestError(req, err, err?.code || "ACCOUNT_DELETION_WORKER_FAILED");
    return sendError(
      res,
      err?.code === "ACCOUNT_DELETION_POLICY_NOT_APPROVED" ? 503 : 500,
      err?.code || "ACCOUNT_DELETION_WORKER_FAILED",
      "Löschaufträge konnten nicht verarbeitet werden.",
      req,
    );
  }
});

app.get("/api/legal/acceptances", requireAuth, async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db
      .from("legal_acceptances")
      .select("document_type,document_version,accepted_at")
      .eq("user_id", req.user.id);
    if (error) return sendSupabaseError(res, error, req, { code: "LEGAL_ACCEPTANCE_FETCH_FAILED", message: "Zustimmungsstatus konnte nicht geladen werden." });
    return res.json({ current: hasCurrentLegalAcceptances(data), requiredVersions: requiredLegalVersions(), acceptances: data ?? [] });
  } catch (err) {
    logRequestError(req, err, err?.code || "LEGAL_ACCEPTANCE_FETCH_FAILED");
    return sendError(res, err?.status || 500, err?.code || "LEGAL_ACCEPTANCE_FETCH_FAILED", "Zustimmungsstatus konnte nicht geladen werden.", req);
  }
});

app.post("/api/legal/acceptances", requireAuth, async (req, res) => {
  try {
    if (req.body?.acceptTerms !== true || req.body?.acceptPrivacy !== true) {
      return sendError(res, 400, "LEGAL_ACCEPTANCE_REQUIRED", "AGB und Datenschutzerklärung müssen aktiv bestätigt werden.", req);
    }
    const salt = process.env.LOG_HASH_SALT;
    const ipHash = salt && req.ip
      ? crypto.createHash("sha256").update(`${salt}:${req.ip}`).digest("hex")
      : null;
    const rows = buildLegalAcceptanceRows({
      userId: req.user.id,
      requestId: req.requestId,
      ipHash,
      userAgent: req.get("user-agent"),
    });
    const db = requireSupabase();
    const { error } = await db.from("legal_acceptances").upsert(rows, {
      onConflict: "user_id,document_type,document_version",
      ignoreDuplicates: true,
    });
    if (error) return sendSupabaseError(res, error, req, { code: "LEGAL_ACCEPTANCE_SAVE_FAILED", message: "Zustimmung konnte nicht gespeichert werden." });
    return res.status(201).json({ current: true, requiredVersions: requiredLegalVersions() });
  } catch (err) {
    logRequestError(req, err, err?.code || "LEGAL_ACCEPTANCE_SAVE_FAILED");
    return sendError(res, err?.status || 500, err?.code || "LEGAL_ACCEPTANCE_SAVE_FAILED", "Zustimmung konnte nicht gespeichert werden.", req);
  }
});

const loadRecipientLink = async (token) => {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(String(token ?? ""))) return null;
  const { data } = await requireSupabase().from("document_recipient_links").select("*").eq("token_hash", hashToken(token)).maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
};

app.post("/api/documents/:type/:id/recipient-link", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`recipient_link_${req.user.id}`, 30);
    const type = normalizeDocType(req.params.type);
    if (!type) return sendError(res, 400, "DOCUMENT_TYPE_INVALID", "Ungültiger Dokumenttyp.", req);
    const table = type === "offer" ? "offers" : "invoices";
    const fields = type === "invoice" ? "id,user_id,status,updated_at,finalized_at" : "id,user_id,status,updated_at";
    const { data: document, error } = await requireSupabase().from(table).select(fields).eq("id", req.params.id).eq("user_id", req.user.id).single();
    if (error || !document) return sendError(res, 404, "DOCUMENT_NOT_FOUND", "Dokument wurde nicht gefunden.", req);
    if (type === "offer" && document.status !== "SENT") return sendError(res, 409, "OFFER_NOT_RESPONDABLE", "Nur versendete Angebote können öffentlich beantwortet werden.", req);
    if (type === "invoice" && !document.finalized_at) return sendError(res, 409, "INVOICE_NOT_FINALIZED", "Nur finalisierte Rechnungen können geteilt werden.", req);
    const db = requireSupabase();
    await db.from("document_recipient_links").update({ revoked_at: new Date().toISOString() }).eq("user_id", req.user.id).eq("document_type", type).eq("document_id", document.id).is("revoked_at", null).is("responded_at", null);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const { error: insertError } = await db.from("document_recipient_links").insert({ user_id: req.user.id, document_type: type, document_id: document.id, token_hash: hashToken(token), document_updated_at: document.updated_at, expires_at: expiresAt });
    if (insertError) throw insertError;
    return res.status(201).json({ url: `${APP_BASE_URL}/recipient/${token}`, expiresAt });
  } catch (err) { logRequestError(req, err, err?.code || "RECIPIENT_LINK_FAILED"); return sendError(res, err?.status || 500, err?.code || "RECIPIENT_LINK_FAILED", "Empfänger-Link konnte nicht erstellt werden.", req); }
});

app.get("/api/public/documents/:token", async (req, res) => {
  try {
    if (req.ip) checkRateLimit(`recipient_view_${req.ip}`, 120);
    const link = await loadRecipientLink(req.params.token);
    if (!link) return sendError(res, 404, "RECIPIENT_LINK_INVALID", "Dieser Link ist ungültig oder abgelaufen.", req);
    const payload = await loadDocumentPayloadFromDb({ type: link.document_type, docId: link.document_id, userId: link.user_id });
    return res.json({ type: link.document_type, doc: payload.doc, client: payload.client, settings: { companyName: payload.settings.companyName, address: payload.settings.address, iban: payload.settings.iban, bic: payload.settings.bic, bankName: payload.settings.bankName, currency: payload.settings.currency, locale: payload.settings.locale }, response: link.response, responseReason: link.response_reason, expiresAt: link.expires_at });
  } catch (err) { logRequestError(req, err, "RECIPIENT_DOCUMENT_FAILED"); return sendError(res, 500, "RECIPIENT_DOCUMENT_FAILED", "Dokument konnte nicht geladen werden.", req); }
});

app.post("/api/public/offers/:token/respond", async (req, res) => {
  try {
    if (req.ip) checkRateLimit(`recipient_response_${req.ip}`, 20);
    const link = await loadRecipientLink(req.params.token);
    if (!link || link.document_type !== "offer") return sendError(res, 404, "RECIPIENT_LINK_INVALID", "Dieser Link ist ungültig oder abgelaufen.", req);
    const response = String(req.body?.response ?? "").toUpperCase();
    if (!["ACCEPTED", "REJECTED"].includes(response)) return sendError(res, 400, "RECIPIENT_RESPONSE_INVALID", "Bitte wähle Annehmen oder Ablehnen.", req);
    const rejectionReason = String(req.body?.rejectionReason ?? "").trim();
    if (rejectionReason.length > 500) return sendError(res, 400, "REJECTION_REASON_TOO_LONG", "Die Ablehnungsbegründung darf höchstens 500 Zeichen enthalten.", req);
    const { data, error } = await requireSupabase().rpc("respond_to_offer_link", { p_link_id: link.id, p_response: response, p_rejection_reason: response === "REJECTED" ? rejectionReason || null : null });
    if (error) {
      const code = ["DOCUMENT_CHANGED", "OFFER_NOT_RESPONDABLE", "LINK_EXPIRED"].find(value => error.message?.includes(value)) || "RECIPIENT_RESPONSE_FAILED";
      return sendError(res, 409, code, code === "DOCUMENT_CHANGED" ? "Das Angebot wurde nach Versand geändert. Bitte fordere einen neuen Link an." : "Das Angebot kann nicht mehr beantwortet werden.", req);
    }
    return res.json({ response: data });
  } catch (err) { logRequestError(req, err, "RECIPIENT_RESPONSE_FAILED"); return sendError(res, 500, "RECIPIENT_RESPONSE_FAILED", "Antwort konnte nicht gespeichert werden.", req); }
});

const getOrCreateStripeCustomer = async (db, stripe, user) => {
  const { data: existing, error: lookupError } = await db.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;
  const customer = await stripe.customers.create({ email: user.email || undefined, metadata: { user_id: user.id } }, { idempotencyKey: `customer:${user.id}` });
  const { error } = await db.from("billing_customers").insert({ user_id: user.id, stripe_customer_id: customer.id });
  if (error) throw error;
  return customer.id;
};

app.get("/api/billing/status", requireAuth, async (req, res) => {
  try {
    const { data, error } = await requireSupabase().from("billing_subscriptions").select("plan_key,status,current_period_end,cancel_at_period_end,payment_failed_at").eq("user_id", req.user.id).maybeSingle();
    if (error) return sendSupabaseError(res, error, req, { code: "BILLING_STATUS_FAILED", message: "Abrechnungsstatus konnte nicht geladen werden." });
    return res.json({ subscription: data ?? { plan_key: "BASIS", status: "INACTIVE", current_period_end: null, cancel_at_period_end: false, payment_failed_at: null } });
  } catch (err) { return sendUnexpectedError(res, err, req); }
});

app.post("/api/billing/checkout", requireAuth, async (req, res) => {
  try {
    const selection = resolvePrice(req.body?.plan, req.body?.cycle);
    const db = requireSupabase();
    const { data: active } = await db.from("billing_subscriptions").select("status").eq("user_id", req.user.id).in("status", ["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID", "PAUSED"]).maybeSingle();
    if (active) return sendError(res, 409, "SUBSCRIPTION_ALREADY_EXISTS", "Ein Abonnement besteht bereits. Bitte verwalte es im Kundenportal.", req);
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(db, stripe, req.user);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", customer: customerId,
      line_items: [{ price: selection.priceId, quantity: 1 }],
      success_url: `${safeReturnUrl(APP_BASE_URL)}?checkout=success`,
      cancel_url: `${safeReturnUrl(APP_BASE_URL)}?checkout=canceled`,
      client_reference_id: req.user.id,
      metadata: { user_id: req.user.id, plan_key: selection.plan },
      subscription_data: { metadata: { user_id: req.user.id, plan_key: selection.plan } },
      allow_promotion_codes: true,
    }, { idempotencyKey: `checkout:${req.user.id}:${selection.priceId}:${Math.floor(Date.now() / 300000)}` });
    return res.status(201).json({ url: session.url });
  } catch (err) {
    logRequestError(req, err, err?.code || "STRIPE_CHECKOUT_FAILED");
    return sendError(res, err?.status || 500, err?.code || "STRIPE_CHECKOUT_FAILED", "Stripe Checkout konnte nicht gestartet werden.", req);
  }
});

app.post("/api/billing/portal", requireAuth, async (req, res) => {
  try {
    const db = requireSupabase();
    const { data, error } = await db.from("billing_customers").select("stripe_customer_id").eq("user_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) return sendError(res, 404, "BILLING_CUSTOMER_NOT_FOUND", "Für dieses Konto besteht noch kein Abrechnungsprofil.", req);
    const session = await getStripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: safeReturnUrl(APP_BASE_URL) });
    return res.json({ url: session.url });
  } catch (err) {
    logRequestError(req, err, err?.code || "STRIPE_PORTAL_FAILED");
    return sendError(res, err?.status || 500, err?.code || "STRIPE_PORTAL_FAILED", "Stripe Kundenportal konnte nicht geöffnet werden.", req);
  }
});

app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) return sendError(res, 503, "STRIPE_WEBHOOK_NOT_CONFIGURED", "Webhook ist nicht konfiguriert.", req);
    event = getStripe().webhooks.constructEvent(req.body, req.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logRequestError(req, err, "STRIPE_SIGNATURE_INVALID");
    return sendError(res, 400, "STRIPE_SIGNATURE_INVALID", "Ungültige Webhook-Signatur.", req);
  }

  const db = requireSupabase();
  const eventCreatedAt = new Date(event.created * 1000);
  const { data: claimed, error: claimError } = await db.rpc("claim_stripe_webhook", { p_event_id: event.id, p_event_type: event.type, p_event_created_at: eventCreatedAt.toISOString() });
  if (claimError) return sendSupabaseError(res, claimError, req, { code: "STRIPE_WEBHOOK_CLAIM_FAILED", message: "Webhook konnte nicht verarbeitet werden." });
  if (!claimed) return res.json({ received: true, duplicate: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.user_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!userId || !customerId) throw Object.assign(new Error("Checkout owner missing."), { code: "STRIPE_OWNER_MISSING" });
      const { error } = await db.from("billing_customers").upsert({ user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    }
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const subscription = event.data.object;
      let userId = subscription.metadata?.user_id;
      if (!userId) {
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        const { data } = await db.from("billing_customers").select("user_id").eq("stripe_customer_id", customerId).single();
        userId = data?.user_id;
      }
      if (!userId) throw Object.assign(new Error("Subscription owner missing."), { code: "STRIPE_OWNER_MISSING" });
      const { data: current } = await db.from("billing_subscriptions").select("last_event_created_at").eq("user_id", userId).maybeSingle();
      if (current?.last_event_created_at && new Date(current.last_event_created_at) > eventCreatedAt) {
        await db.from("stripe_webhook_events").update({ status: "PROCESSED", processed_at: new Date().toISOString(), last_error_code: "STALE_EVENT_IGNORED" }).eq("event_id", event.id);
        return res.json({ received: true, stale: true });
      }
      const { error } = await db.from("billing_subscriptions").upsert(subscriptionRow(subscription, userId, eventCreatedAt), { onConflict: "user_id" });
      if (error) throw error;
    }
    if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
      const invoice = event.data.object;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subscriptionId) {
        const failed = event.type === "invoice.payment_failed";
        const { error } = await db.from("billing_subscriptions").update({ status: failed ? "PAST_DUE" : "ACTIVE", payment_failed_at: failed ? eventCreatedAt.toISOString() : null, last_event_created_at: eventCreatedAt.toISOString(), updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId).or(`last_event_created_at.is.null,last_event_created_at.lte.${eventCreatedAt.toISOString()}`);
        if (error) throw error;
      }
    }
    await db.from("stripe_webhook_events").update({ status: "PROCESSED", processed_at: new Date().toISOString() }).eq("event_id", event.id);
    return res.json({ received: true });
  } catch (err) {
    await db.from("stripe_webhook_events").update({ status: "FAILED", last_error_code: String(err?.code || "PROCESSING_FAILED").slice(0, 100) }).eq("event_id", event.id);
    logRequestError(req, err, err?.code || "STRIPE_WEBHOOK_PROCESSING_FAILED");
    return sendError(res, 500, "STRIPE_WEBHOOK_PROCESSING_FAILED", "Webhook konnte nicht verarbeitet werden.", req);
  }
});

app.post("/api/pdf/link", requireAuth, async (req, res) => {
  try {
    checkRateLimit(`pdf_user_${req.user.id}`, 60);
    if (req.ip) checkRateLimit(`pdf_ip_${req.ip}`, 120);

    const docId = req.body?.docId ?? req.body?.documentId ?? null;
    const type = normalizeDocType(req.body?.type ?? req.body?.documentType);
    if (!docId || !type) {
      return sendError(res, 400, "VALIDATION_ERROR", "Missing required fields: docId, type", req);
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    await storePdfDownloadToken(tokenHash, { userId: req.user.id, docId, type });

    const url = `${APP_BASE_URL}/api/pdf/download?token=${encodeURIComponent(token)}`;
    res.json({ ok: true, url });
  } catch (err) {
    const status = err?.status || 500;
    const code = err?.code || "pdf_link_failed";
    logRequestError(req, err, code);
    return sendError(res, status, code, "PDF link generation failed.", req);
  }
});

const computeInvoiceIsOverdue = (invoice) => {
  if (!invoice) return false;
  if (!["ISSUED", "SENT"].includes(invoice.status)) return false;
  if (invoice.paid_at || invoice.canceled_at) return false;
  if (!invoice.due_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(invoice.due_date);
  return due.getTime() < today.getTime();
};

const loadInvoiceForUser = async (supabase, invoiceId) => {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    return { error };
  }

  return { invoice };
};

app.post("/api/invoices/:id/finalize", requireAuth, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      return sendError(res, 400, "BAD_REQUEST", "Missing invoice id.", req);
    }

    const token = getBearerToken(req);
    if (!token) {
      return sendError(res, 401, "NOT_AUTHENTICATED", "Unauthorized", req);
    }
    const supabase = createUserSupabaseClient(token);
    const { error } = await supabase.rpc("finalize_invoice", {
      invoice_id: invoiceId,
    });

    if (error) {
      return sendSupabaseError(res, error, req, {
        status: 500,
        code: "FINALIZE_FAILED",
        message: "Rechnung konnte nicht finalisiert werden.",
      });
    }

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (fetchError || !invoice) {
      if (fetchError) {
        return sendSupabaseError(res, fetchError, req, {
          status: 500,
          code: "FINALIZE_FAILED",
          message: "Rechnung konnte nicht finalisiert werden.",
        });
      }
      return sendError(res, 500, "FINALIZE_FAILED", "Invoice finalization failed.", req);
    }

    return res.json({ ok: true, invoice: { ...invoice, is_overdue: computeInvoiceIsOverdue(invoice) } });
  } catch (err) {
    return sendUnexpectedError(res, err, req);
  }
});

app.post("/api/invoices/:id/mark-sent", requireAuth, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      return sendError(res, 400, "BAD_REQUEST", "Missing invoice id.", req);
    }

    const token = getBearerToken(req);
    if (!token) {
      return sendError(res, 401, "NOT_AUTHENTICATED", "Unauthorized", req);
    }
    const supabase = createUserSupabaseClient(token);
    const { invoice, error } = await loadInvoiceForUser(supabase, invoiceId);
    if (error) {
      return sendSupabaseError(res, error, req, {
        status: 500,
        code: "LOAD_FAILED",
        message: "Rechnung konnte nicht geladen werden.",
      });
    }
    if (!invoice) {
      return sendError(res, 404, "NOT_FOUND", "Invoice not found.", req);
    }
    if (invoice.status !== "ISSUED") {
      return sendError(res, 400, "STATUS_TRANSITION_NOT_ALLOWED", "Status transition not allowed.", req);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "SENT",
        sent_at: invoice.sent_at ?? nowIso,
        last_sent_at: nowIso,
        sent_count: (invoice.sent_count ?? 0) + 1,
        sent_via: "MANUAL",
        updated_at: nowIso,
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (updateError || !updated) {
      if (updateError) {
        return sendSupabaseError(res, updateError, req, {
          status: 500,
          code: "UPDATE_FAILED",
          message: "Rechnung konnte nicht aktualisiert werden.",
        });
      }
      return sendError(res, 500, "UPDATE_FAILED", "Invoice update failed.", req);
    }

    return res.json({ ok: true, invoice: { ...updated, is_overdue: computeInvoiceIsOverdue(updated) } });
  } catch (err) {
    return sendUnexpectedError(res, err, req);
  }
});

app.post("/api/invoices/:id/mark-paid", requireAuth, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      return sendError(res, 400, "BAD_REQUEST", "Missing invoice id.", req);
    }

    const token = getBearerToken(req);
    if (!token) {
      return sendError(res, 401, "NOT_AUTHENTICATED", "Unauthorized", req);
    }
    const supabase = createUserSupabaseClient(token);
    const { invoice, error } = await loadInvoiceForUser(supabase, invoiceId);
    if (error) {
      return sendSupabaseError(res, error, req, {
        status: 500,
        code: "LOAD_FAILED",
        message: "Rechnung konnte nicht geladen werden.",
      });
    }
    if (!invoice) {
      return sendError(res, 404, "NOT_FOUND", "Invoice not found.", req);
    }
    if (!["ISSUED", "SENT"].includes(invoice.status)) {
      return sendError(res, 400, "STATUS_TRANSITION_NOT_ALLOWED", "Status transition not allowed.", req);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "PAID",
        paid_at: nowIso,
        payment_date: nowIso,
        updated_at: nowIso,
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (updateError || !updated) {
      if (updateError) {
        return sendSupabaseError(res, updateError, req, {
          status: 500,
          code: "UPDATE_FAILED",
          message: "Rechnung konnte nicht aktualisiert werden.",
        });
      }
      return sendError(res, 500, "UPDATE_FAILED", "Invoice update failed.", req);
    }

    return res.json({ ok: true, invoice: { ...updated, is_overdue: computeInvoiceIsOverdue(updated) } });
  } catch (err) {
    return sendUnexpectedError(res, err, req);
  }
});

app.post("/api/invoices/:id/cancel", requireAuth, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      return sendError(res, 400, "BAD_REQUEST", "Missing invoice id.", req);
    }

    const token = getBearerToken(req);
    if (!token) {
      return sendError(res, 401, "NOT_AUTHENTICATED", "Unauthorized", req);
    }
    const supabase = createUserSupabaseClient(token);
    const { invoice, error } = await loadInvoiceForUser(supabase, invoiceId);
    if (error) {
      return sendSupabaseError(res, error, req, {
        status: 500,
        code: "LOAD_FAILED",
        message: "Rechnung konnte nicht geladen werden.",
      });
    }
    if (!invoice) {
      return sendError(res, 404, "NOT_FOUND", "Invoice not found.", req);
    }
    if (!["ISSUED", "SENT"].includes(invoice.status)) {
      return sendError(res, 400, "STATUS_TRANSITION_NOT_ALLOWED", "Status transition not allowed.", req);
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "CANCELED",
        canceled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", invoiceId)
      .select("*")
      .single();

    if (updateError || !updated) {
      if (updateError) {
        return sendSupabaseError(res, updateError, req, {
          status: 500,
          code: "UPDATE_FAILED",
          message: "Rechnung konnte nicht aktualisiert werden.",
        });
      }
      return sendError(res, 500, "UPDATE_FAILED", "Invoice update failed.", req);
    }

    return res.json({ ok: true, invoice: { ...updated, is_overdue: computeInvoiceIsOverdue(updated) } });
  } catch (err) {
    return sendUnexpectedError(res, err, req);
  }
});

app.get("/api/pdf/download", async (req, res) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) {
      return sendError(res, 400, "VALIDATION_ERROR", "Missing token.", req);
    }

    const tokenPayload = await consumePdfDownloadToken(token);
    if (!tokenPayload?.userId || !tokenPayload?.docId || !tokenPayload?.type) {
      return sendError(res, 401, "invalid_token", "Invalid or expired token.", req);
    }

    const payload = await loadDocumentPayloadFromDb({
      type: tokenPayload.type,
      docId: tokenPayload.docId,
      userId: tokenPayload.userId,
    });

    const { buffer, filename } = await createPdfAttachment({
      type: tokenPayload.type,
      payload,
      requestId: req.requestId,
      source: "api_pdf_download",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.status(200).send(buffer);
  } catch (err) {
    const status = err?.status || 500;
    const code = err?.code || "pdf_generation_failed";
    logRequestError(req, err, code);
    return sendError(res, status, code, "PDF generation failed.", req);
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
    logRequestError(req, err, err?.code || "SENDER_IDENTITY_CREATE_FAILED");
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
    logRequestError(req, err, err?.code || "SENDER_IDENTITY_RESEND_FAILED");
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
    logRequestError(req, err, err?.code || "SENDER_IDENTITY_VERIFY_FAILED");
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
    logRequestError(req, err, err?.code || "SENDER_IDENTITIES_FETCH_FAILED");
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
    logRequestError(req, err, err?.code || "SENDER_IDENTITY_DISABLE_FAILED");
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
    logRequestError(req, err, err?.code || "SENDER_IDENTITY_UPDATE_FAILED");
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
    if (!FROM_ADDRESS) {
      return sendError(res, 501, "EMAIL_NOT_CONFIGURED", "E-Mail Versand ist nicht konfiguriert.");
    }

    const replyTo = buildReplyTo(identity.email, identity.display_name);
    const fromName = identity.display_name || SENDER_DOMAIN_NAME;
    const from = `${fromName} via ${SENDER_DOMAIN_NAME} <${FROM_ADDRESS}>`;

    await transporter.sendMail({
      from,
      to: identity.email,
      subject: "Testmail Lightning Bold",
      text: "Test erfolgreich.",
      replyTo,
      sender: `${SENDER_DOMAIN_NAME} <${FROM_ADDRESS}>`,
    });

    await audit({
      userId,
      action: "sender_identity_test_email_sent",
      entityType: "sender_identity",
      entityId: identity.id,
    });

    res.json({ ok: true });
  } catch (err) {
    logRequestError(req, err, err?.code || "TEST_EMAIL_FAILED");
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
    let pendingRecipientLinkId = null;
    try {
      if (!req.user?.id) {
      return sendError(res, 401, "unauthorized", "Unauthorized", req);
    }
      const userId = req.user.id;
      await requireEntitlement(requireSupabase(), userId, "SEND_EMAIL");

      const {
        to,
        cc,
        bcc,
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
          "Missing required fields: docId, type, to, subject, senderIdentityId",
          req
        );
      }

      const toList = parseEmailList(to);
      if (!toList.length || toList.some((entry) => !isValidEmail(entry))) {
        return sendError(res, 400, "invalid_email", "Invalid recipient email.", req);
      }
      const ccList = parseEmailList(cc);
      if (ccList.some((entry) => !isValidEmail(entry))) {
        return sendError(res, 400, "invalid_cc", "Invalid CC email.", req);
      }
      const bccList = parseEmailList(bcc);
      if (bccList.some((entry) => !isValidEmail(entry))) {
        return sendError(res, 400, "invalid_bcc", "Invalid BCC email.", req);
      }

      const subjectText = String(subject ?? "");
      if (subjectText.length > EMAIL_SUBJECT_MAX) {
        return sendError(res, 400, "subject_too_long", "Subject too long.", req);
      }

      const messageText = String(message ?? "");
      if (messageText.length > EMAIL_MESSAGE_MAX) {
        return sendError(res, 400, "message_too_long", "Message too long.", req);
      }

      const payload = await loadDocumentPayloadFromDb({
        type,
        docId,
        userId,
      });

      enforceLegacyPayloadMatch(req.body, payload);

      let recipientUrl = null;
      if (type === "offer") {
        const db = requireSupabase();
        const { data: offer, error: offerError } = await db
          .from("offers")
          .select("id,updated_at")
          .eq("id", docId)
          .eq("user_id", userId)
          .single();
        if (offerError || !offer) throw offerError ?? new Error("Offer not found");

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
        const { data: link, error: linkError } = await db
          .from("document_recipient_links")
          .insert({
            user_id: userId,
            document_type: "offer",
            document_id: offer.id,
            token_hash: hashToken(token),
            document_updated_at: offer.updated_at,
            expires_at: expiresAt,
          })
          .select("id")
          .single();
        if (linkError || !link) throw linkError ?? new Error("Recipient link could not be created");
        pendingRecipientLinkId = link.id;
        recipientUrl = `${APP_BASE_URL}/recipient/${token}`;
      }

      const transporter = await ensureMailer();
      const resolvedFrom = FROM_HEADER;
      const resolvedFromAddress = FROM_ADDRESS;

      if (!resolvedFrom || !resolvedFromAddress) {
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
      const from = `${fromName} via ${SENDER_DOMAIN_NAME} <${resolvedFromAddress}>`;

      const { buffer, filename } = await createPdfAttachment({
        type,
        payload,
        requestId: req.requestId,
        source: "api_email",
      });

      const recipientEmail = recipientUrl
        ? buildOfferRecipientEmail(messageText, recipientUrl)
        : { text: messageText, html: undefined };
      const info = await transporter.sendMail({
        from,
        to: toList.join(", "),
        cc: ccList.length ? ccList.join(", ") : undefined,
        bcc: bccList.length ? bccList.join(", ") : undefined,
        subject: subjectText,
        text: recipientEmail.text,
        html: recipientEmail.html,
        replyTo,
        sender: `${SENDER_DOMAIN_NAME} <${resolvedFromAddress}>`,
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
        meta: { to: toList.join(", "), sender_identity_id: identity.id, message_id: info?.messageId ?? null },
      });

      const userToken = getBearerToken(req);
      if (!userToken) {
        return sendError(res, 401, "NOT_AUTHENTICATED", "Missing auth token.", req);
      }
      const supabaseUser = createUserSupabaseClient(userToken);
      const rpcName = type === "invoice" ? "mark_invoice_sent" : "mark_offer_sent";
      // Manual smoke test: POST /api/email with Authorization: Bearer <user JWT> and verify
      // the RPC sees auth.uid() != null (e.g. mark_*_sent succeeds and updates sender metadata).
      // Must be user-scoped because DB uses auth.uid()
      const { error: markError } = await supabaseUser.rpc(rpcName, {
        doc_id: docId,
        p_to: toList.join(", "),
        p_via: "EMAIL",
      });
      if (markError) {
        const normalized = normalizeDbError(markError);
        const err = new Error("Failed to mark document as sent");
        if (normalized) {
          err.status = normalized.httpStatus;
          err.code = normalized.code;
          err.message = normalized.message;
        } else {
          err.status = 500;
        }
        throw err;
      }

      if (pendingRecipientLinkId) {
        const db = requireSupabase();
        const { data: sentOffer, error: sentOfferError } = await db
          .from("offers")
          .select("updated_at")
          .eq("id", docId)
          .eq("user_id", userId)
          .single();
        if (sentOfferError || !sentOffer) throw sentOfferError ?? new Error("Sent offer could not be loaded");
        const nowIso = new Date().toISOString();
        const { error: activateError } = await db
          .from("document_recipient_links")
          .update({ document_updated_at: sentOffer.updated_at })
          .eq("id", pendingRecipientLinkId)
          .eq("user_id", userId);
        if (activateError) throw activateError;
        await db
          .from("document_recipient_links")
          .update({ revoked_at: nowIso })
          .eq("user_id", userId)
          .eq("document_type", "offer")
          .eq("document_id", docId)
          .neq("id", pendingRecipientLinkId)
          .is("revoked_at", null)
          .is("responded_at", null);
        pendingRecipientLinkId = null;
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      if (pendingRecipientLinkId) {
        try {
          await requireSupabase()
            .from("document_recipient_links")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", pendingRecipientLinkId);
        } catch {
          // Preserve the original send error; an undelivered token is not exposed.
        }
      }
      logRequestError(req, err, err?.code || "EMAIL_SEND_FAILED");
      const dbError = normalizeDbError(err);
      if (dbError) {
        return sendError(res, dbError.httpStatus, dbError.code, dbError.message, req);
      }
      if (err?.code === "SUPABASE_NOT_CONFIGURED") {
        return sendError(res, 500, "SUPABASE_NOT_CONFIGURED", "Supabase not configured.", req);
      }
      if (err?.code === "SUPABASE_ANON_KEY_MISSING") {
        return sendError(res, 500, "SUPABASE_NOT_CONFIGURED", "Supabase anon key missing.", req);
      }
      if (err?.code === "SMTP_NOT_CONFIGURED") {
        return sendError(
          res,
          501,
          "EMAIL_NOT_CONFIGURED",
          "E-Mail Versand ist nicht konfiguriert. Bitte SMTP_HOST/SMTP_USER/SMTP_PASS setzen.",
          req
        );
      }
      const message = typeof err?.message === "string" && err.message.trim().length > 0
        ? err.message
        : "Email send failed.";
      return sendError(res, err?.status || 500, err?.code || "EMAIL_SEND_FAILED", message, req);
    }
  }
);

// Liveness confirms that the process responds. Readiness additionally verifies
// required configuration and a minimal database query without exposing details.
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/health/ready", async (req, res) => {
  const result = await evaluateReadiness({
    supabase: supabaseAdmin,
    hasUrl: Boolean(SUPABASE_URL),
    hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE),
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
  });
  return res.status(result.ready ? 200 : 503).json({
    status: result.ready ? "ready" : "not_ready",
    checks: result.checks,
    requestId: req.requestId,
  });
});

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
  buildCanonicalInvoice,
  serializeCanonicalInvoiceToCii,
  createPdfAttachment,
  hashPayload,
  buildPdfFilename,
  assertInvoiceFinalizedForEinvoice,
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
