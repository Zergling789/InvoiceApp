import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/migrations/20260715175139_intelligent_line_items.sql", import.meta.url);

test("intelligent line item tables enforce ownership with RLS", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  for (const table of ["position_templates", "position_groups", "position_group_items", "position_suggestion_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /\(select auth\.uid\(\)\) = user_id/i);
  assert.match(sql, /revoke all .* from anon/is);
  assert.match(sql, /create extension if not exists pg_trgm/i);
});
