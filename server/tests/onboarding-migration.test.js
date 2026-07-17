import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260717115329_add_onboarding_progress.sql",
  import.meta.url,
);

test("onboarding migration preserves existing users and constrains progress", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /add column if not exists onboarding_step text/);
  assert.match(sql, /from auth\.users as users/);
  assert.match(sql, /set onboarding_step = 'done'/);
  assert.match(sql, /alter column onboarding_step set default 'welcome'/);
  assert.match(
    sql,
    /onboarding_step in \('welcome', 'company', 'tax', 'customer', 'offer', 'done'\)/,
  );
  assert.match(sql, /onboarding_step = 'done' and onboarding_completed_at is not null/);
});
