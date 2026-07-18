import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260718121313_filter_document_pages.sql",
  import.meta.url,
);
const clientSearchMigrationUrl = new URL(
  "../../supabase/migrations/20260718122341_search_document_clients_in_database.sql",
  import.meta.url,
);

test("document page filters stay owner-scoped and preserve workflow phases", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /returns setof public\.offers/);
  assert.match(sql, /returns setof public\.invoices/);
  assert.equal((sql.match(/security invoker/g) ?? []).length, 2);
  assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 2);
  assert.equal((sql.match(/user_id = \(select auth\.uid\(\)\)/g) ?? []).length, 2);
  assert.match(sql, /i\.due_date < coalesce\(p_today, current_date\) then 'overdue'/);
  assert.match(sql, /i\.payment_date is not null or upper\(coalesce\(i\.status, ''\)\) = 'paid' then 'paid'/);
  assert.match(sql, /upper\(coalesce\(o\.status, ''\)\) = 'accepted' then 'accepted'/);
  assert.match(sql, /revoke all on function public\.list_offer_documents_page/);
  assert.match(sql, /revoke all on function public\.list_invoice_documents_page/);
  assert.match(sql, /grant execute on function public\.list_offer_documents_page[^;]+to authenticated, service_role/);
  assert.match(sql, /grant execute on function public\.list_invoice_documents_page[^;]+to authenticated, service_role/);
});

test("document search resolves customer names inside the database with owner isolation", async () => {
  const sql = (await readFile(clientSearchMigrationUrl, "utf8")).toLowerCase();

  assert.match(sql, /exists\s*\(\s*select 1\s*from public\.clients c/);
  assert.equal((sql.match(/c\.user_id = \(select auth\.uid\(\)\)/g) ?? []).length, 2);
  assert.equal((sql.match(/security invoker/g) ?? []).length, 2);
  assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 2);
});
