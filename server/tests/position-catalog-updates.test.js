import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/migrations/20260716102421_transactional_position_group_updates.sql", import.meta.url);
const serverUrl = new URL("../index.js", import.meta.url);

test("package updates are atomic, ordered and owner-scoped", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /language plpgsql\s+security invoker\s+set search_path = ''/i);
  assert.match(sql, /where id = p_group_id and user_id = v_user_id\s+for update/i);
  assert.match(sql, /template\.user_id = v_user_id/i);
  assert.match(sql, /with ordinality as source\(item, item_order\)/i);
  assert.match(sql, /item_order - 1/i);
  assert.match(sql, /coalesce\(\(item->>'optional'\)::boolean, false\)/i);
  assert.match(sql, /jsonb_array_length\(p_items\) < 1/i);
  assert.match(sql, /unitPrice[\s\S]*numeric < 0/i);
  assert.match(sql, /revoke execute .* from public, anon/i);
  assert.match(sql, /grant execute .* to authenticated/i);
});

test("template and package updates require authentication and reuse validation", async () => {
  const source = await readFile(serverUrl, "utf8");
  assert.match(source, /app\.patch\("\/api\/positions\/templates\/:id", requireAuth/);
  assert.match(source, /const values = parsePositionTemplateInput\(req\.body\)/);
  assert.match(source, /price !== null && \(!Number\.isFinite\(price\) \|\| price < 0\)/);
  assert.match(source, /!name \|\| name\.length > 200/);
  assert.match(source, /app\.patch\("\/api\/positions\/groups\/:id", requireAuth/);
  assert.match(source, /items\.length === 0/);
  assert.match(source, /db\.rpc\("save_position_group"/);
});
