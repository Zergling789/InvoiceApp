import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SERVER_TEST_MODE = "1";
process.env.PDF_TEST_MODE = "1";

const { loadDocumentPayloadFromDb, createPdfBufferFromPayload, createPdfAttachment } = await import(
  "../index.js"
);

const fixtures = {
  invoices: [
    {
      id: "inv_1",
      user_id: "user_1",
      number: "RE-0001",
      client_id: "client_1",
      project_id: null,
      date: "2025-01-01",
      due_date: "2025-01-15",
      positions: [
        { id: "p1", description: "Dev", quantity: 2, unit: "h", price: 100 },
      ],
      intro_text: "Hallo",
      footer_text: "Danke",
      vat_rate: 19,
    },
  ],
  offers: [],
  user_settings: [
    {
      user_id: "user_1",
      company_name: "Acme GmbH",
      address: "Street 1",
      tax_id: "",
      iban: "",
      bic: "",
      bank_name: "",
      footer_text: "",
    },
  ],
  clients: [
    {
      id: "client_1",
      user_id: "user_1",
      company_name: "Client AG",
      contact_person: "",
      email: "client@example.com",
      address: "Client Road 2",
    },
  ],
};

function createMockSupabase(data) {
  return {
    from(table) {
      const state = { table, filters: {} };
      const rows = data[table] ?? [];
      const applyFilters = () =>
        rows.find((row) =>
          Object.entries(state.filters).every(([key, value]) => row[key] === value)
        ) ?? null;
      return {
        select() {
          return this;
        },
        eq(key, value) {
          state.filters[key] = value;
          return this;
        },
        single() {
          const row = applyFilters();
          return Promise.resolve({ data: row, error: row ? null : { message: "Not found" } });
        },
        maybeSingle() {
          const row = applyFilters();
          return Promise.resolve({ data: row, error: null });
        },
      };
    },
  };
}

test("PDF generation is deterministic for the same invoice", async () => {
  const supabase = createMockSupabase(fixtures);
  const payload = await loadDocumentPayloadFromDb({
    type: "invoice",
    docId: "inv_1",
    userId: "user_1",
    supabase,
  });

  const bufferA = await createPdfBufferFromPayload("invoice", payload);
  const bufferB = await createPdfBufferFromPayload("invoice", payload);

  assert.equal(bufferA.toString("utf8"), bufferB.toString("utf8"));
});

test("Email attachment uses the server-generated PDF buffer", async () => {
  const supabase = createMockSupabase(fixtures);
  const payload = await loadDocumentPayloadFromDb({
    type: "invoice",
    docId: "inv_1",
    userId: "user_1",
    supabase,
  });

  const { buffer } = await createPdfAttachment({ type: "invoice", payload });
  const directBuffer = await createPdfBufferFromPayload("invoice", payload);

  assert.equal(buffer.toString("utf8"), directBuffer.toString("utf8"));
});