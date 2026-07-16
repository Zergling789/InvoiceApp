import assert from "node:assert/strict";
import test from "node:test";

import { generateInvoiceDraft, invoiceDraftSchema, sanitizeDraftDescription } from "../ai/invoiceDraft.js";

const validDraft = {
  positions: [{ title: "Webdesign", description: "Konzeption und Umsetzung", quantity: 2, unit: "Std", category: "Web", internalNote: "", subpositions: [], priceSourceId: "template-1" }],
  introText: "Vielen Dank für Ihren Auftrag.",
  footerText: "Zahlbar innerhalb von 14 Tagen.",
  warnings: [],
};

test("AI draft validates structured responses", () => {
  assert.deepEqual(invoiceDraftSchema.parse(validDraft), validDraft);
  assert.equal(invoiceDraftSchema.safeParse({ ...validDraft, positions: [] }).success, false);
  assert.equal(invoiceDraftSchema.safeParse({ ...validDraft, positions: [{ ...validDraft.positions[0], quantity: 0 }] }).success, false);
});

test("AI draft redacts common personal and financial identifiers", () => {
  const sanitized = sanitizeDraftDescription("Müller GmbH test@example.de IBAN DE89370400440532013000 Musterstraße 12");
  assert.equal(sanitized.includes("test@example.de"), false);
  assert.equal(sanitized.includes("DE89370400440532013000"), false);
  assert.equal(sanitized.includes("Müller GmbH"), false);
  assert.equal(sanitized.includes("Musterstraße 12"), false);
});

test("AI generation reports missing server configuration", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(() => generateInvoiceDraft({ description: "Test", documentType: "invoice", currency: "EUR", vatRate: 19, userId: "user" }), { code: "AI_NOT_CONFIGURED" });
  if (previousKey) process.env.OPENAI_API_KEY = previousKey;
});

test("AI generation returns a validated response without a real API call", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "test-model";
  const client = { responses: { parse: async () => ({ output_parsed: validDraft }) } };
  const result = await generateInvoiceDraft({ description: "Webdesign", documentType: "offer", currency: "EUR", vatRate: 19, userId: "user-1", client, priceCandidates: [{ id: "template-1", title: "Webdesign", kind: "SERVICE", source: "Leistungskatalog", lastPrice: 95, taxCategory: "STANDARD", taxRate: 19 }] });
  assert.equal(result.positions[0].price, 95);
  assert.equal(result.positions[0].priceNeedsReview, false);
  assert.equal(result.positions[0].source.id, "template-1");
  if (previousKey) process.env.OPENAI_API_KEY = previousKey; else delete process.env.OPENAI_API_KEY;
  if (previousModel) process.env.OPENAI_MODEL = previousModel; else delete process.env.OPENAI_MODEL;
});
