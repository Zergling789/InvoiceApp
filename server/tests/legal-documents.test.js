import assert from "node:assert/strict";
import test from "node:test";
import { buildLegalAcceptanceRows, hasCurrentLegalAcceptances, requiredLegalVersions } from "../legalDocuments.js";

test("current terms and privacy versions are both required", () => {
  assert.deepEqual(requiredLegalVersions(), { TERMS: "2026-07-13", PRIVACY: "2026-07-13" });
  assert.equal(hasCurrentLegalAcceptances([{ document_type: "TERMS", document_version: "2026-07-13" }]), false);
  assert.equal(hasCurrentLegalAcceptances([
    { document_type: "TERMS", document_version: "2026-07-13" },
    { document_type: "PRIVACY", document_version: "2026-07-13" },
  ]), true);
});

test("acceptance evidence uses stable hashes and bounded metadata", () => {
  const rows = buildLegalAcceptanceRows({ userId: "user-1", requestId: "request-1", ipHash: "hash", userAgent: "a".repeat(500) });
  assert.equal(rows.length, 2);
  assert.match(rows[0].document_sha256, /^[a-f0-9]{64}$/);
  assert.equal(rows[0].user_agent.length, 300);
});
