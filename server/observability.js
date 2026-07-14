import crypto from "crypto";

const SENSITIVE_KEY = /authorization|cookie|password|token|secret|api[-_]?key|service[-_]?role|smtp|dsn/i;
const MAX_DEPTH = 5;

export const redactLogValue = (value, depth = 0) => {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (value instanceof Error) {
    return {
      name: value.name,
      code: typeof value.code === "string" ? value.code : undefined,
    };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactLogValue(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactLogValue(entry, depth + 1),
      ])
    );
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
};

export const hashLogUserId = (userId) => {
  if (!userId) return undefined;
  const salt = process.env.LOG_HASH_SALT;
  if (!salt) return undefined;
  return crypto.createHash("sha256").update(`${salt}:${userId}`).digest("hex").slice(0, 16);
};

export const logEvent = (level, event, fields = {}) => {
  const payload = redactLogValue({
    timestamp: new Date().toISOString(),
    level,
    event,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    ...fields,
  });
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
};

export const logRequestError = (req, error, errorCode = "UNEXPECTED_ERROR") =>
  logEvent("error", "request_failed", {
    requestId: req?.requestId,
    method: req?.method,
    route: req?.route?.path || req?.path,
    errorCode,
    error,
    userIdHash: hashLogUserId(req?.user?.id),
  });

export const evaluateReadiness = async ({ supabase, hasUrl, hasServiceRole, hasAnonKey }) => {
  const configuration = hasUrl && hasServiceRole && hasAnonKey ? "ok" : "missing";
  let database = "unavailable";

  if (configuration === "ok" && supabase) {
    try {
      const { error } = await supabase.from("user_settings").select("user_id").limit(1);
      database = error ? "unavailable" : "ok";
    } catch {
      database = "unavailable";
    }
  }

  return {
    ready: configuration === "ok" && database === "ok",
    checks: { configuration, database },
  };
};
