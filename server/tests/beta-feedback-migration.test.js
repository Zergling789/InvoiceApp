import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("beta feedback is RLS protected and browser immutable", async () => {
  const sql = (await readFile(new URL("../../supabase/migrations/20260714180032_beta_feedback.sql", import.meta.url), "utf8")).toLowerCase();
  assert.match(sql, /alter table public\.beta_feedback enable row level security/);
  assert.match(sql, /revoke all on table public\.beta_feedback from public, anon, authenticated/);
  assert.match(sql, /bug.*understanding.*feature_request/);
  assert.doesNotMatch(sql, /screenshot_(url|data)/);
});
