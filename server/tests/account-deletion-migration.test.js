import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account deletion claims are atomic and service-role only", async () => {
  const sql = (await readFile(
    new URL("../../supabase/migrations/20260714113855_account_deletion_worker_claims.sql", import.meta.url),
    "utf8",
  )).toLowerCase();

  assert.match(sql, /for update skip locked/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /revoke all on function public\.claim_due_account_deletions/);
  assert.match(sql, /grant execute on function public\.claim_due_account_deletions\(integer, text\)\s+to service_role/);
  assert.match(sql, /on delete set null/);
});
