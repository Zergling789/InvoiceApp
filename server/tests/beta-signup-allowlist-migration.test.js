import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260715172921_beta_signup_allowlist.sql",
  import.meta.url,
);
const serviceRoleMigrationUrl = new URL(
  "../../supabase/migrations/20260715173450_beta_signup_allowlist_service_role_management.sql",
  import.meta.url,
);

test("closed beta signup hook is server-only, expiring and single-use", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /alter table public\.beta_signup_allowlist enable row level security/);
  assert.match(sql, /to supabase_auth_admin/);
  assert.match(sql, /revoke all on table public\.beta_signup_allowlist from public, anon, authenticated/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.match(sql, /consumed_at is null/);
  assert.match(sql, /expires_at > now\(\)/);
  assert.match(sql, /message', 'beta_invite_required'/);
  assert.doesNotMatch(sql, /grant (insert|delete|all).*authenticated/);
});

test("only the server role can administratively manage beta invitations", async () => {
  const sql = (await readFile(serviceRoleMigrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /grant select, insert, delete on table public\.beta_signup_allowlist to service_role/);
  assert.doesNotMatch(sql, /grant .* to (anon|authenticated)/);
});
