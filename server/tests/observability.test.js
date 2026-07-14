import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReadiness, redactLogValue } from "../observability.js";

test("redacts nested credentials and reduces errors to safe metadata", () => {
  const error = new Error("contains private database details");
  error.code = "DB_DOWN";
  const result = redactLogValue({ authorization: "Bearer secret", nested: { password: "secret", error } });

  assert.equal(result.authorization, "[REDACTED]");
  assert.equal(result.nested.password, "[REDACTED]");
  assert.deepEqual(result.nested.error, { name: "Error", code: "DB_DOWN" });
  assert.equal(JSON.stringify(result).includes("private database details"), false);
});

test("readiness succeeds only with complete configuration and database access", async () => {
  const healthy = { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) };
  const ready = await evaluateReadiness({ supabase: healthy, hasUrl: true, hasServiceRole: true, hasAnonKey: true });
  assert.deepEqual(ready, { ready: true, checks: { configuration: "ok", database: "ok" } });

  const missing = await evaluateReadiness({ supabase: null, hasUrl: true, hasServiceRole: false, hasAnonKey: true });
  assert.deepEqual(missing, { ready: false, checks: { configuration: "missing", database: "unavailable" } });
});
