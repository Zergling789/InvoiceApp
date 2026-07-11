import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("offer conversion copies the positions JSON including position tax fields", async () => {
  const migration = await readFile(new URL("../../supabase/migrations/20260711181050_stabilize_invoice_market_scope.sql", import.meta.url), "utf8");
  const functionBody = migration.slice(migration.indexOf("create or replace function public.convert_offer_to_invoice"));
  assert.match(functionBody, /offer_rec\.positions/);
  assert.doesNotMatch(functionBody, /jsonb_(set|build_object)[\s\S]*offer_rec\.positions/);
  assert.match(functionBody, /offer_rec\.currency/);
  assert.match(functionBody, /copy_customer_snapshot_to_invoice/);
});
