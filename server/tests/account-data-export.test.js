import assert from "node:assert/strict";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { buildAccountExportZip, csvEscape, loadOwnedAccountData, rowsToCsv } from "../accountDataExport.js";

test("CSV escaping handles quotes, commas and line breaks", () => {
  assert.equal(csvEscape('GmbH, "Nord"'), '"GmbH, ""Nord"""');
  assert.equal(csvEscape("Zeile 1\nZeile 2"), '"Zeile 1\nZeile 2"');
  assert.match(rowsToCsv([{ name: "A,B", count: 2 }]), /"A,B"/);
});

test("account ZIP contains valid manifest, JSON and CSV files", () => {
  const zip = buildAccountExportZip({
    user: { id: "user-a", email: "a@example.test", created_at: "2026-01-01T00:00:00Z" },
    datasets: { clients: [{ id: "client-a", user_id: "user-a", company_name: "A GmbH" }], invoices: [] },
    generatedAt: "2026-07-13T12:00:00Z",
  });
  const files = unzipSync(zip);
  assert.ok(files["README.txt"]);
  assert.deepEqual(JSON.parse(strFromU8(files["clients.json"])), [{ id: "client-a", user_id: "user-a", company_name: "A GmbH" }]);
  assert.equal(JSON.parse(strFromU8(files["manifest.json"])).tables.clients, 1);
  assert.match(strFromU8(files["clients.csv"]), /A GmbH/);
});

test("account export queries every dataset with its ownership column", async () => {
  const filters = [];
  const supabase = { from(table) { return { select() { return this; }, eq(column, value) { filters.push([table, column, value]); return Promise.resolve({ data: [], error: null }); } }; } };
  await loadOwnedAccountData(supabase, "user-a");
  assert.ok(filters.some(([table, column]) => table === "profiles" && column === "id"));
  assert.ok(filters.every(([, , value]) => value === "user-a"));
  assert.ok(filters.some(([table, column]) => table === "invoices" && column === "user_id"));
});
