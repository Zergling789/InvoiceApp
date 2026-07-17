import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SERVER_TEST_MODE = "1";
process.env.PDF_TEST_MODE = "1";

const { loadDocumentPayloadFromDb, createPdfBufferFromPayload, createPdfAttachment } = await import(
  "../index.js"
);
const { renderDocumentHtml } = await import("../renderDocumentHtml.js");

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

test("PDF generation keeps working when the optional payment BIC is invalid", async () => {
  const supabase = createMockSupabase(fixtures);
  const payload = await loadDocumentPayloadFromDb({
    type: "invoice",
    docId: "inv_1",
    userId: "user_1",
    supabase,
  });
  payload.settings.iban = "DE89370400440532013000";
  payload.settings.bic = "INVALID";

  const html = (await createPdfBufferFromPayload("invoice", payload)).toString("utf8");
  assert.match(html, /Mit Banking-App bezahlen/);
  assert.match(html, /data:image\/png;base64/);
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

test("PDF renderer applies the selected layout, color, and embedded logo", () => {
  const logoDataUrl = "data:image/png;base64,iVBORw0KGgo=";
  const html = renderDocumentHtml({
    type: "invoice",
    doc: fixtures.invoices[0],
    settings: {
      companyName: "Acme GmbH",
      templateId: "modern",
      primaryColor: "#123abc",
      logoDataUrl,
    },
    client: fixtures.clients[0],
  });

  assert.match(html, /class="template-modern"/);
  assert.match(html, /--accent: #123abc/);
  assert.match(html, /class="company-logo"/);
  assert.match(html, /data:image\/png;base64,iVBORw0KGgo=/);
});

test("PDF renderer rejects unsafe branding values", () => {
  const html = renderDocumentHtml({
    type: "invoice",
    settings: {
      templateId: "<script>",
      primaryColor: "red; background:url(x)",
      logoDataUrl: "javascript:alert(1)",
    },
  });

  assert.match(html, /class="template-classic"/);
  assert.match(html, /--accent: #4f46e5/);
  assert.doesNotMatch(html, /javascript:alert/);
});

test("PDF renderer prints service period and mixed position taxes", () => {
  const html = renderDocumentHtml({
    type: "invoice",
    doc: {
      number: "RE-42",
      date: "2026-07-10",
      servicePeriodStart: "2026-07-01",
      servicePeriodEnd: "2026-07-09",
      positions: [
        { description: "Beratung", quantity: 1, unit: "Std", price: 100, taxCategory: "STANDARD", taxRate: 19 },
        { description: "Publikation", quantity: 1, unit: "Stk", price: 100, taxCategory: "REDUCED", taxRate: 7 },
      ],
    },
    settings: { locale: "de-DE", currency: "EUR" },
    client: {},
  });

  assert.match(html, /Leistungszeitraum/);
  assert.match(html, /MwSt \(19%\)/);
  assert.match(html, /MwSt \(7%\)/);
  assert.match(html, /Regelsteuersatz \(19 %\)/);
  assert.match(html, /Ermäßigter Steuersatz \(7 %\)/);
  assert.match(html, /Nettobetrag/);
  assert.match(html, /Steuer<\/th>/);
  assert.match(html, /226,00/);
});

test("PDF renderer prints buyer reference and separate seller tax identifiers", () => {
  const html = renderDocumentHtml({
    type: "invoice",
    doc: { number: "RE-43", date: "2026-07-11", buyerReference: "PO-4711", positions: [] },
    settings: { sellerTaxNumber: "12/345/67890", sellerVatId: "DE123456789" },
    client: {},
  });
  assert.match(html, /PO-4711/);
  assert.match(html, /12\/345\/67890/);
  assert.match(html, /DE123456789/);
});

test("PDF renderer embeds the EPC payment QR only for invoices", () => {
  const qr = "data:image/png;base64,cXItY29kZQ==";
  const invoiceHtml = renderDocumentHtml({ type: "invoice", doc: { positions: [] }, settings: { paymentQrDataUrl: qr }, client: {} });
  const offerHtml = renderDocumentHtml({ type: "offer", doc: { positions: [] }, settings: { paymentQrDataUrl: qr }, client: {} });
  assert.match(invoiceHtml, /Mit Banking-App bezahlen/);
  assert.match(invoiceHtml, /data:image\/png;base64,cXItY29kZQ==/);
  assert.doesNotMatch(offerHtml, /Mit Banking-App bezahlen/);
});
