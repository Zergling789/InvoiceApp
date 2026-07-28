import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260723183110_project_task_workflow.sql",
  import.meta.url,
);
const grantMigrationUrl = new URL(
  "../../supabase/migrations/20260723184351_harden_project_task_grants.sql",
  import.meta.url,
);

test("project task workflow uses validated RPC mutations and organization isolation", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /create policy project_tasks_member_select/);
  assert.match(sql, /revoke insert, update, delete on public\.project_tasks from authenticated/);
  assert.match(sql, /create or replace function public\.create_project_task/);
  assert.match(sql, /create or replace function public\.update_project_task/);
  assert.match(sql, /create or replace function public\.list_project_task_assignees/);
  assert.match(sql, /security definer[\s\S]*organization_access_denied/);
  assert.match(sql, /invalid_task_assignee/);
  assert.match(sql, /'task_created'/);
  assert.match(sql, /'task_completed'/);
  assert.match(sql, /on conflict \(organization_id, event_key\)[\s\S]*do nothing/);
});

test("authenticated task table privileges are read-only", async () => {
  const sql = (await readFile(grantMigrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /revoke all privileges on table public\.project_tasks from authenticated/);
  assert.match(sql, /grant select on table public\.project_tasks to authenticated/);
});
