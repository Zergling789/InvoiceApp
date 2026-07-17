import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createErrorReporter, evaluateReadiness, NoopErrorReporter, redactLogValue } from "../observability.js";

test("redacts nested credentials and reduces errors to safe metadata", () => {
  const error = new Error("contains private database details");
  error.code = "DB_DOWN";
  const result = redactLogValue({ authorization: "Bearer secret", nested: { password: "secret", error } });

  assert.equal(result.authorization, "[REDACTED]");
  assert.equal(result.nested.password, "[REDACTED]");
  assert.deepEqual(result.nested.error, { name: "Error", code: "DB_DOWN" });
  assert.equal(JSON.stringify(result).includes("private database details"), false);
});

test("redaction removes business content and reporter defaults to no-op", () => {
  const redacted = redactLogValue({ prompt: "secret prompt", invoiceData: { customer: "Muster GmbH" }, safeCode: "FAILED" });
  assert.equal(redacted.prompt, "[REDACTED]");
  assert.equal(redacted.invoiceData, "[REDACTED]");
  delete process.env.ERROR_REPORTER_MODE;
  assert.ok(createErrorReporter() instanceof NoopErrorReporter);
});

test("readiness succeeds only with complete configuration and database access", async () => {
  const healthy = { from: () => ({ select: () => ({ limit: async () => ({ error: null }) }) }) };
  const ready = await evaluateReadiness({ supabase: healthy, hasUrl: true, hasServiceRole: true, hasAnonKey: true });
  assert.deepEqual(ready, { ready: true, checks: { configuration: "ok", database: "ok" } });

  const missing = await evaluateReadiness({ supabase: null, hasUrl: true, hasServiceRole: false, hasAnonKey: true });
  assert.deepEqual(missing, { ready: false, checks: { configuration: "missing", database: "unavailable" } });
});

test("email document diagnostics never log raw document or user identifiers", async () => {
  const source = await readFile(new URL("../index.js", import.meta.url), "utf8");
  const lookup = source.match(/const loadDocumentPayloadFromDb[\s\S]*?const doc =/)?.[0] ?? "";

  assert.doesNotMatch(lookup, /console\.log/);
  assert.doesNotMatch(lookup, /\{\s*type: resolvedType, docId, userId/);
  assert.match(lookup, /userIdHash: hashLogUserId\(userId\)/);
});
