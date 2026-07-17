import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const conversionMigration = new URL(
  "../../supabase/migrations/20260717144854_require_accepted_offer_conversion.sql",
  import.meta.url,
);
const decisionMigration = new URL(
  "../../supabase/migrations/20260717145000_record_manual_offer_decision.sql",
  import.meta.url,
);
const invokerMigration = new URL(
  "../../supabase/migrations/20260717145439_use_invoker_offer_conversion.sql",
  import.meta.url,
);

test("offer conversion requires an accepted, owned and not yet converted offer", async () => {
  const sql = (await readFile(conversionMigration, "utf8")).toLowerCase();

  assert.match(sql, /where id = offer_id\s+and user_id = uid\s+for update/);
  assert.match(sql, /offer_rec\.status <> 'accepted'/);
  assert.match(sql, /offer_not_accepted/);
  assert.match(sql, /offer_already_converted/);
  assert.match(sql, /set search_path = pg_catalog, public/);
  assert.match(sql, /grant execute on function public\.convert_offer_to_invoice\(uuid\) to authenticated/);
});

test("manual offer decisions are owner scoped, status guarded and logged atomically", async () => {
  const sql = (await readFile(decisionMigration, "utf8")).toLowerCase();

  assert.match(sql, /security invoker/);
  assert.match(sql, /where id = offer_id\s+and user_id = uid\s+for update/);
  assert.match(sql, /offer_rec\.status <> 'sent'/);
  assert.match(sql, /offer_not_respondable/);
  assert.match(sql, /insert into public\.document_activity/);
  assert.match(sql, /jsonb_build_object\('source', 'manual'\)/);
  assert.match(sql, /revoke all on function public\.record_offer_decision\(uuid, text\) from public, anon/);
});

test("offer conversion ultimately runs with the caller's RLS permissions", async () => {
  const sql = (await readFile(invokerMigration, "utf8")).toLowerCase();

  assert.match(sql, /alter function public\.convert_offer_to_invoice\(uuid\) security invoker/);
  assert.match(sql, /revoke all on function public\.convert_offer_to_invoice\(uuid\) from public, anon/);
  assert.match(sql, /grant execute on function public\.convert_offer_to_invoice\(uuid\) to authenticated/);
});
