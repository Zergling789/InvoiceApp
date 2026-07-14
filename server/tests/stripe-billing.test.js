import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import { getStripe, normalizeStripeStatus, resolvePrice, subscriptionRow } from "../billing/stripeBilling.js";

test("price selection only accepts configured server-side plan keys", () => {
  process.env.STRIPE_PRICE_SOLO_MONTHLY = "price_solo";
  assert.deepEqual(resolvePrice("solo", "monthly"), { plan: "SOLO", cycle: "monthly", priceId: "price_solo" });
  assert.throws(() => resolvePrice("enterprise", "monthly"), error => error.code === "BILLING_PLAN_INVALID");
  assert.throws(() => subscriptionRow({ id: "sub_bad", customer: "cus_1", status: "active", items: { data: [{ price: { id: "price_manipulated" } }] } }, "user-1"), error => error.code === "STRIPE_PRICE_UNKNOWN");
});

test("Stripe subscription is normalized to the local billing model", () => {
  process.env.STRIPE_PRICE_PRO_YEARLY = "price_pro";
  const row = subscriptionRow({ id: "sub_1", customer: "cus_1", status: "past_due", cancel_at_period_end: true, items: { data: [{ price: { id: "price_pro" }, current_period_end: 1800000000 }] } }, "user-1");
  assert.equal(row.plan_key, "PRO");
  assert.equal(row.status, "PAST_DUE");
  assert.equal(row.cancel_at_period_end, true);
  assert.equal(normalizeStripeStatus("unknown"), "INACTIVE");
});

test("webhook signatures are verified against the unmodified payload", () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_123";
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_1", object: "event", type: "customer.subscription.updated", data: { object: {} } });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(getStripe().webhooks.constructEvent(payload, signature, secret).id, "evt_1");
  assert.throws(() => getStripe().webhooks.constructEvent(`${payload} `, signature, secret));
});
