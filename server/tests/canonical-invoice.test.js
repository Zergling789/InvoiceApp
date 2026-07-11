import assert from "node:assert/strict";
import test from "node:test";
import { buildCanonicalInvoice, canonicalInvoiceToRenderPayload } from "../einvoice/canonicalInvoice.js";

const source = { doc: { number:"RE-1",date:"2026-07-11",currency:"EUR",serviceDate:"2026-07-10",buyerReference:"PO-1",positions:[{id:"1",description:"Beratung",quantity:2,unit:"HUR",price:100,taxCategory:"STANDARD",taxRate:19},{id:"2",description:"Buch",quantity:1,unit:"C62",price:50,taxCategory:"REDUCED",taxRate:7}] }, settings:{companyName:"Seller GmbH",address:"Straße 1\n10115 Berlin",sellerTaxNumber:"12/345",sellerVatId:"DE123",currency:"EUR"}, client:{companyName:"Buyer GmbH",address:"Weg 2\n20095 Hamburg"} };

test("canonical invoice derives lines, tax breakdown and totals once",()=>{const invoice=buildCanonicalInvoice(source);assert.equal(invoice.specification,"EN16931_CORE");assert.deepEqual(invoice.totals,{netTotal:250,taxTotal:41.5,grossTotal:291.5});assert.deepEqual(invoice.taxBreakdown.map(x=>[x.rate,x.taxAmount]),[[19,38],[7,3.5]]);assert.equal(invoice.buyerReference,"PO-1");assert.ok(Object.isFrozen(invoice));});
test("PDF adapter preserves canonical monetary and identity data",()=>{const invoice=buildCanonicalInvoice(source);const render=canonicalInvoiceToRenderPayload(invoice,source);const rebuilt=buildCanonicalInvoice(render);assert.deepEqual(rebuilt.lines,invoice.lines);assert.deepEqual(rebuilt.taxBreakdown,invoice.taxBreakdown);assert.deepEqual(rebuilt.totals,invoice.totals);assert.equal(render.settings.sellerVatId,"DE123");});
