import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260723115528_project_centric_foundation.sql",
  import.meta.url,
);

test("project foundation is organization-scoped, indexed and event-idempotent", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /create table if not exists public\.organizations/);
  assert.match(sql, /create table if not exists public\.organization_members/);
  assert.match(sql, /create table if not exists public\.project_activities/);
  assert.match(sql, /create table if not exists public\.project_tasks/);
  assert.match(sql, /create table if not exists public\.project_appointments/);
  assert.match(sql, /foreign key \(project_id, organization_id\)/);
  assert.match(sql, /foreign key \(client_id, organization_id\)/);
  assert.match(sql, /projects_organization_number_key/);
  assert.match(sql, /project_activities_event_key/);
  assert.match(sql, /security definer[\s\S]*organization_access_denied/);
  assert.match(sql, /revoke insert, update, delete on public\.project_activities from authenticated/);
  assert.match(sql, /create or replace function public\.list_projects_page/);
  assert.match(sql, /when project\.next_action_at < now\(\) then 0/);
});

