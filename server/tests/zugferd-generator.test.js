import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { generateValidatedZugferd } from "../einvoice/zugferdGenerator.js";

const xml = "<rsm:CrossIndustryInvoice />";
const xmlHash = crypto.createHash("sha256").update(xml, "utf8").digest("hex");
const pdf = Buffer.from("%PDF-1.7\nvalidated");
const validResponse = (overrides = {}) => ({ status: "VALID", profile: "EN16931", embeddedXmlSha256: xmlHash, pdfBase64: pdf.toString("base64"), validationCode: "VALID", validationSummary: "Validated.", ...overrides });

test("validated generator request follows the stable contract", async () => {
  let request;
  const result = await generateValidatedZugferd({
    requestId: "request-123",
    visualPdf: Buffer.from("%PDF-1.7\nvisual"), ciiXml: xml,
    generatorUrl: "https://generator.example/v1/zugferd", generatorToken: "secret-token",
    fetchImpl: async (_url, init) => { request = JSON.parse(init.body); return new Response(JSON.stringify(validResponse())); },
  });
  assert.deepEqual(Object.keys(request).sort(), ["expectedXmlSha256", "profile", "requestId", "visiblePdfBase64", "xmlBase64"]);
  assert.equal(request.expectedXmlSha256, xmlHash);
  assert.equal(request.requestId, "request-123");
  assert.equal(result.xmlHash, xmlHash);
  assert.deepEqual(result.pdf, pdf);
});

test("missing generator configuration is blocked explicitly", async () => {
  await assert.rejects(generateValidatedZugferd({ visualPdf: pdf, ciiXml: xml, generatorUrl: "", generatorToken: "" }), (error) => error.code === "EINVOICE_GENERATOR_NOT_CONFIGURED" && error.status === 503);
});

test("invalid visible PDF is rejected before transmission", async () => {
  await assert.rejects(generateValidatedZugferd({ visualPdf: Buffer.from("not-pdf"), ciiXml: xml, generatorUrl: "https://generator.example", generatorToken: "token" }), (error) => error.code === "EINVOICE_INPUT_INVALID");
});

test("mismatching embedded XML hash and invalid status are rejected", async () => {
  for (const response of [validResponse({ embeddedXmlSha256: "0".repeat(64) }), validResponse({ status: "INVALID", pdfBase64: undefined })]) {
    await assert.rejects(generateValidatedZugferd({ visualPdf: pdf, ciiXml: xml, generatorUrl: "https://generator.example", generatorToken: "token", fetchImpl: async () => new Response(JSON.stringify(response)) }), (error) => error.code === "EINVOICE_VALIDATION_FAILED" && error.status === 422);
  }
});

test("unknown response fields and wrong profiles fail strict validation", async () => {
  for (const response of [validResponse({ unexpected: true }), { ...validResponse(), profile: "BASIC" }]) {
    await assert.rejects(generateValidatedZugferd({ visualPdf: pdf, ciiXml: xml, generatorUrl: "https://generator.example", generatorToken: "token", fetchImpl: async () => new Response(JSON.stringify(response)) }), (error) => error.code === "EINVOICE_GENERATOR_RESPONSE_INVALID");
  }
});

test("timeouts and authentication failures use stable codes", async () => {
  await assert.rejects(generateValidatedZugferd({ visualPdf: pdf, ciiXml: xml, generatorUrl: "https://generator.example", generatorToken: "token", timeoutMs: 5, fetchImpl: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))) }), (error) => error.code === "EINVOICE_GENERATION_TIMEOUT");
  await assert.rejects(generateValidatedZugferd({ visualPdf: pdf, ciiXml: xml, generatorUrl: "https://generator.example", generatorToken: "token", fetchImpl: async () => new Response("", { status: 401 }) }), (error) => error.code === "EINVOICE_GENERATOR_AUTH_FAILED");
});
