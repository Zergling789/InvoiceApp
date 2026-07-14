import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bootstrapName = "20260710073509_bootstrap_set_updated_at.sql";
const dependentName = "20260710073510_baseline_security_hardening.sql";

test("fresh database bootstrap defines the secured trigger helper before dependent migrations", async () => {
  assert.ok(bootstrapName < dependentName, "bootstrap migration must sort before the dependent baseline");

  const sql = (await readFile(new URL(`../../supabase/migrations/${bootstrapName}`, import.meta.url), "utf8")).toLowerCase();
  assert.match(sql, /create or replace function public\.set_updated_at\(\)/);
  assert.match(sql, /language plpgsql/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.match(sql, /revoke all on function public\.set_updated_at\(\) from public, anon, authenticated/);
});
