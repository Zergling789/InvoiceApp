import assert from "node:assert/strict";
import test from "node:test";
import { getPlanEntitlements, getUsageLimit, incrementUsage, requireEntitlement } from "../billing/entitlements.js";

test("plan entitlements and monthly limits are centralized", () => {
  assert.equal(getPlanEntitlements("BASIS").includes("SEND_EMAIL"), false);
  assert.equal(getPlanEntitlements("SOLO").includes("EINVOICE_EXPORT"), true);
  assert.equal(getPlanEntitlements("PRO").includes("DATA_EXPORT"), true);
  assert.equal(getUsageLimit("BASIS", "AI_DRAFT"), 3);
  assert.equal(getUsageLimit("PRO", "AI_DRAFT"), 150);
});

test("inactive subscriptions cannot unlock premium APIs", async () => {
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_key: "PRO", status: "PAST_DUE" }, error: null }) }) }) }) };
  await assert.rejects(requireEntitlement(db, "user-1", "EINVOICE_EXPORT"), (error) => error.code === "PLAN_REQUIRED");
});

test("usage increment delegates the race-safe decision to the database RPC", async () => {
  let args;
  const db = { rpc: async (_name, value) => { args = value; return { data: 3, error: null }; } };
  const result = await incrementUsage(db, "user-1", "BASIS", "AI_DRAFT", new Date("2026-07-14T12:00:00Z"));
  assert.equal(args.p_period_start, "2026-07-01");
  assert.equal(args.p_period_end, "2026-08-01");
  assert.deepEqual(result, { unlimited: false, quantity: 3, limit: 3 });
});
