import Stripe from "stripe";

const PLAN_ENV = Object.freeze({
  "SOLO:monthly": "STRIPE_PRICE_SOLO_MONTHLY",
  "SOLO:yearly": "STRIPE_PRICE_SOLO_YEARLY",
  "PRO:monthly": "STRIPE_PRICE_PRO_MONTHLY",
  "PRO:yearly": "STRIPE_PRICE_PRO_YEARLY",
});

export const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error("Stripe is not configured."), { code: "STRIPE_NOT_CONFIGURED", status: 503 });
  return new Stripe(key);
};

export const resolvePrice = (plan, cycle) => {
  const normalizedPlan = String(plan || "").toUpperCase();
  const normalizedCycle = String(cycle || "").toLowerCase();
  const envName = PLAN_ENV[`${normalizedPlan}:${normalizedCycle}`];
  const priceId = envName ? process.env[envName] : null;
  if (!envName) throw Object.assign(new Error("Unsupported billing plan."), { code: "BILLING_PLAN_INVALID", status: 400 });
  if (!priceId) throw Object.assign(new Error("Price is not configured."), { code: "STRIPE_PRICE_NOT_CONFIGURED", status: 503 });
  return { plan: normalizedPlan, cycle: normalizedCycle, priceId };
};

export const planForPrice = (priceId) => {
  const match = Object.entries(PLAN_ENV).find(([, envName]) => process.env[envName] === priceId);
  if (!match) throw Object.assign(new Error("Stripe price is not mapped to a plan."), { code: "STRIPE_PRICE_UNKNOWN", status: 422 });
  return match[0].split(":")[0];
};

export const normalizeStripeStatus = (status) => ({
  trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", unpaid: "UNPAID",
  paused: "PAUSED", canceled: "CANCELED", incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
}[status] ?? "INACTIVE");

export const subscriptionRow = (subscription, userId, eventCreatedAt = new Date()) => {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const periodEnd = subscription.current_period_end ?? item?.current_period_end;
  return {
    user_id: userId,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan_key: planForPrice(priceId),
    status: normalizeStripeStatus(subscription.status),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    last_event_created_at: eventCreatedAt.toISOString(),
    payment_failed_at: null,
    updated_at: new Date().toISOString(),
  };
};

export const safeReturnUrl = (base, path = "/app/plans") => `${base.replace(/\/$/, "")}${path}`;
