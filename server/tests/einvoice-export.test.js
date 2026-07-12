import assert from "node:assert/strict";
import test from "node:test";

process.env.SERVER_TEST_MODE = "1";

const { assertInvoiceFinalizedForEinvoice, loadDocumentPayloadFromDb } = await import("../index.js");

test("draft invoices are rejected with a stable e-invoice error code", () => {
  assert.throws(
    () => assertInvoiceFinalizedForEinvoice({ finalizedAt: null }),
    (error) => error.code === "EINVOICE_NOT_FINALIZED" && error.status === 409,
  );
});

test("finalized invoices are accepted for e-invoice export", () => {
  assert.doesNotThrow(() => assertInvoiceFinalizedForEinvoice({ finalizedAt: "2026-07-12T12:00:00Z" }));
});

test("invoice database payload retains finalization state", async () => {
  const rows = {
    invoices: [{ id: "invoice-a", user_id: "user-a", status: "ISSUED", finalized_at: "2026-07-12T12:00:00Z", positions: [] }],
    user_settings: [{ user_id: "user-a" }],
  };
  const supabase = {
    from(table) {
      const filters = {};
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        async single() {
          const data = (rows[table] ?? []).find((row) => Object.entries(filters).every(([key, value]) => row[key] === value)) ?? null;
          return { data, error: data ? null : { message: "Not found" } };
        },
        async maybeSingle() {
          const data = (rows[table] ?? []).find((row) => Object.entries(filters).every(([key, value]) => row[key] === value)) ?? null;
          return { data, error: null };
        },
      };
      return query;
    },
    storage: { from: () => ({ download: async () => ({ data: null, error: { message: "missing" } }) }) },
  };

  const payload = await loadDocumentPayloadFromDb({ type: "invoice", docId: "invoice-a", userId: "user-a", supabase });
  assert.equal(payload.doc.status, "ISSUED");
  assert.equal(payload.doc.finalizedAt, "2026-07-12T12:00:00Z");
});
