export const PLAN_ENTITLEMENTS = Object.freeze({
  BASIS: Object.freeze(["CREATE_DOCUMENT", "RECIPIENT_PORTAL", "AI_DRAFT"]),
  SOLO: Object.freeze(["CREATE_DOCUMENT", "UNLIMITED_DOCUMENTS", "SEND_EMAIL", "CUSTOM_BRANDING", "AI_DRAFT", "EINVOICE_EXPORT", "RECIPIENT_PORTAL"]),
  PRO: Object.freeze(["CREATE_DOCUMENT", "UNLIMITED_DOCUMENTS", "SEND_EMAIL", "CUSTOM_BRANDING", "AI_DRAFT", "EINVOICE_EXPORT", "DATA_EXPORT", "RECIPIENT_PORTAL"]),
});

const ACTIVE_STATUSES = new Set(["TRIALING", "ACTIVE"]);
const USAGE_LIMITS = Object.freeze({ BASIS: Object.freeze({ AI_DRAFT: 3, DOCUMENTS: 5 }), SOLO: Object.freeze({ AI_DRAFT: 30 }), PRO: Object.freeze({ AI_DRAFT: 150 }) });

export class EntitlementError extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status; }
}

export const getPlanEntitlements = (plan) => PLAN_ENTITLEMENTS[String(plan ?? "BASIS").toUpperCase()] ?? PLAN_ENTITLEMENTS.BASIS;
export const getUsageLimit = (plan, metric) => USAGE_LIMITS[String(plan ?? "BASIS").toUpperCase()]?.[metric] ?? null;

export async function getEffectivePlan(db, userId) {
  const { data, error } = await db.from("billing_subscriptions").select("plan_key,status").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data || !ACTIVE_STATUSES.has(data.status)) return "BASIS";
  return ["SOLO", "PRO"].includes(data.plan_key) ? data.plan_key : "BASIS";
}

export async function requireEntitlement(db, userId, entitlement) {
  const plan = await getEffectivePlan(db, userId);
  if (!getPlanEntitlements(plan).includes(entitlement)) throw new EntitlementError(plan === "BASIS" ? "PLAN_REQUIRED" : "FEATURE_NOT_INCLUDED");
  return plan;
}

export async function incrementUsage(db, userId, plan, metric, now = new Date()) {
  const limit = getUsageLimit(plan, metric);
  if (limit === null) return { unlimited: true, quantity: null, limit: null };
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const { data, error } = await db.rpc("increment_billing_usage", { p_user_id: userId, p_metric: metric, p_period_start: periodStart.toISOString().slice(0, 10), p_period_end: periodEnd.toISOString().slice(0, 10), p_limit: limit });
  if (error) {
    if (String(error.message).includes("USAGE_LIMIT_REACHED")) throw new EntitlementError("USAGE_LIMIT_REACHED", 429);
    throw error;
  }
  return { unlimited: false, quantity: data, limit };
}
