import assert from "node:assert/strict";
import test from "node:test";

import { rankPositionSuggestions, textRelevance } from "../positionSuggestions.js";

test("position search handles prefixes and small typos deterministically", () => {
  assert.ok(textRelevance("pflastern", "Pflasterarbeiten") > 0);
  assert.ok(textRelevance("anfart", "Anfahrtspauschale") > 0);
  assert.ok(textRelevance("terrasse", "Unterbauarbeiten herstellen") > 0);
  assert.equal(textRelevance("hosting", "Minibagger inklusive Bediener"), 0);
});

test("ranking prefers exact, frequent and customer-specific candidates and deduplicates", () => {
  const result = rankPositionSuggestions({
    query: "Anfahrt",
    customerId: "customer-1",
    templates: [{ id: "template-1", kind: "SERVICE", name: "Anfahrt", description: "", unit: "Pauschal", default_unit_price: 30, tax_category: "STANDARD", tax_rate: 19, usage_count: 5 }],
    invoices: [{ id: "invoice-1", client_id: "customer-1", updated_at: new Date().toISOString(), positions: [{ id: "line-1", description: "Anfahrtspauschale", quantity: 1, unit: "Pauschal", price: 25, taxCategory: "STANDARD", taxRate: 19 }] }],
  });
  assert.equal(result[0].id, "template-1");
  assert.equal(result[1].customerSpecific, true);
});

test("history parsing rejects invalid monetary values", () => {
  const result = rankPositionSuggestions({ query: "Test", invoices: [{ id: "invoice-1", positions: [{ description: "Test", quantity: -1, price: -10 }] }] });
  assert.deepEqual(result, []);
});
