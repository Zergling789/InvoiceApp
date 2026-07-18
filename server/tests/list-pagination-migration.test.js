import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260718114941_paginate_clients_and_projects.sql",
  import.meta.url,
);

test("customer and project pagination remains owner-scoped and index-backed", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /clients \(user_id, created_at desc, id desc\)/);
  assert.match(sql, /projects \(user_id, created_at desc, id desc\)/);
  assert.match(sql, /projects \(user_id, status, created_at desc, id desc\)/);
  assert.match(sql, /create or replace function public\.get_project_metrics\(\)/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /p\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /revoke all on function public\.get_project_metrics\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.get_project_metrics\(\) to authenticated, service_role/);
});
