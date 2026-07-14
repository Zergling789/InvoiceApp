import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/migrations/20260713171641_create_legal_acceptances.sql", import.meta.url);

test("legal acceptance migration is RLS protected and client immutable", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();
  assert.match(sql, /alter table public\.legal_acceptances enable row level security/);
  assert.match(sql, /for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /revoke all on table public\.legal_acceptances from anon, authenticated/);
  assert.match(sql, /grant select on table public\.legal_acceptances to authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)/);
});
