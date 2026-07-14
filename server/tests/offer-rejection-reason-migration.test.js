import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("offer rejection reasons are bounded and written by the server-only response RPC", async () => {
  const sql = (await readFile(new URL("../../supabase/migrations/20260714110014_add_offer_rejection_reason.sql", import.meta.url), "utf8")).toLowerCase();

  assert.match(sql, /char_length\(normalized_reason\) > 500/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = public, pg_temp/);
  assert.match(sql, /set status=p_response, rejection_reason=normalized_reason/);
  assert.match(sql, /set response=p_response, response_reason=normalized_reason/);
  assert.match(sql, /revoke all on function public\.respond_to_offer_link\(uuid,text,text\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.respond_to_offer_link\(uuid,text,text\) to service_role/);
});
