import assert from "node:assert/strict";
import test from "node:test";
import { buildCanonicalInvoice } from "../einvoice/canonicalInvoice.js";
import { serializeCanonicalInvoiceToCii } from "../einvoice/ciiSerializer.js";

const build = (patch = {}) => buildCanonicalInvoice({
  doc: {
    number: "RE-1", date: "2026-07-11", currency: "EUR", serviceDate: "2026-07-10",
    sellerCountry: "DE", customerCountry: "DE", customerType: "BUSINESS", serviceCountry: "DE",
    dueDate: "2026-07-25", buyerReference: "PO<&>",
    positions: [{ id: "1", description: "Beratung & Entwicklung", quantity: 2, unit: "Std", price: 100, taxCategory: "STANDARD", taxRate: 19 }],
    ...patch,
  },
  settings: { companyName: "Seller GmbH", address: "Straße 1", sellerCountry: "DE", sellerStreet: "Straße", sellerHouseNumber: "1", sellerPostalCode: "10115", sellerCity: "Berlin", sellerElectronicAddress: "seller@example.de", sellerTaxNumber: "12/345", iban: "DE02120300000000202051" },
  client: { companyName: "Buyer GmbH", address: "Weg 2", street: "Weg", houseNumber: "2", postalCode: "20095", city: "Hamburg", invoiceEmail: "buyer@example.de" },
});

test("CII contains canonical invoice data, totals and escaped text", () => {
  const xml = serializeCanonicalInvoiceToCii(build());
  assert.match(xml, /urn:factur-x\.eu:1p0:en16931/);
  assert.match(xml, /PO&lt;&amp;&gt;/);
  assert.match(xml, /unitCode="HUR"/);
  assert.match(xml, /<ram:TaxTotalAmount currencyID="EUR">38\.00/);
  assert.match(xml, /<ram:GrandTotalAmount>238\.00/);
  assert.doesNotMatch(xml, /LineTwo/);
  assert.doesNotMatch(xml, /schemeID="VA"/);
});

test("CII supports service period and small business tax group", () => {
  const xml = serializeCanonicalInvoiceToCii(build({ serviceDate: null, servicePeriodStart: "2026-07-01", servicePeriodEnd: "2026-07-10", isSmallBusiness: true, positions: [{ id: "1", description: "Leistung", quantity: 1, unit: "Stk", price: 100, taxCategory: "SMALL_BUSINESS", taxRate: 0 }] }));
  assert.match(xml, /BillingSpecifiedPeriod/);
  assert.match(xml, /<ram:CategoryCode>E/);
  assert.match(xml, /Kleinunternehmerregelung/);
  assert.match(xml, /<ram:TaxTotalAmount currencyID="EUR">0\.00/);
});
