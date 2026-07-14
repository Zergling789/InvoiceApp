import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("recipient links are hash-only and offer responses are server-only and version guarded", async () => {
  const sql = (await readFile(new URL("../../supabase/migrations/20260713174638_recipient_portal_and_payment_qr.sql", import.meta.url), "utf8")).toLowerCase();
  assert.match(sql, /token_hash text not null unique/);
  assert.match(sql, /offer_rec\.updated_at is distinct from link_rec\.document_updated_at/);
  assert.match(sql, /for update/);
  assert.match(sql, /security invoker set search_path = public, pg_temp/);
  assert.match(sql, /grant execute on function public\.respond_to_offer_link\(uuid,text\) to service_role/);
  assert.doesNotMatch(sql, /grant (insert|update|delete).*authenticated/);
});
