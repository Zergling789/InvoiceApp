import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260723191713_project_appointment_workflow.sql",
  import.meta.url,
);
const grantsMigrationUrl = new URL(
  "../../supabase/migrations/20260723192850_harden_project_appointment_grants.sql",
  import.meta.url,
);

test("project appointment workflow is organization-scoped and client read-only", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /create policy project_appointments_member_select/);
  assert.match(sql, /revoke all privileges on table public\.project_appointments from authenticated/);
  assert.match(sql, /grant select on table public\.project_appointments to authenticated/);
  assert.match(sql, /create or replace function public\.create_project_appointment/);
  assert.match(sql, /create or replace function public\.update_project_appointment/);
  assert.match(sql, /organization_access_denied/);
  assert.match(sql, /invalid_appointment_period/);
  assert.match(sql, /invalid_appointment_type/);
  assert.match(sql, /project_appointments_calendar_idx/);
  assert.match(sql, /'appointment_created'/);
  assert.match(
    sql,
    /'appointment:' \|\| inserted_appointment\.id::text \|\| ':created'/,
  );
});

test("project appointment table grants exclude anonymous clients", async () => {
  const sql = (await readFile(grantsMigrationUrl, "utf8")).toLowerCase();

  assert.match(
    sql,
    /revoke all privileges on table public\.project_appointments from public, anon, authenticated/,
  );
  assert.match(
    sql,
    /grant select on table public\.project_appointments to authenticated/,
  );
});
