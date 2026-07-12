import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { generateValidatedZugferd } from "../einvoice/zugferdGenerator.js";

const xml = "<rsm:CrossIndustryInvoice />";
const xmlHash = crypto.createHash("sha256").update(xml, "utf8").digest("hex");
const pdf = Buffer.from("%PDF-1.7\nvalidated");

test("validated generator response returns stable PDF and XML hashes", async () => {
  let request;
  const result = await generateValidatedZugferd({
    visualPdf: Buffer.from("%PDF-1.7\nvisual"),
    ciiXml: xml,
    generatorUrl: "https://generator.example/v1/zugferd",
    generatorToken: "secret-token",
    fetchImpl: async (_url, init) => {
      request = JSON.parse(init.body);
      return new Response(JSON.stringify({
        status: "VALID",
        profile: "EN16931",
        pdfaLevel: "PDF/A-3",
        validator: "Mustang 2.24.0",
        embeddedXmlSha256: xmlHash,
        pdfBase64: pdf.toString("base64"),
      }));
    },
  });

  assert.equal(request.xmlSha256, xmlHash);
  assert.equal(request.profile, "EN16931");
  assert.equal(result.xmlHash, xmlHash);
  assert.deepEqual(result.pdf, pdf);
  assert.equal(result.validationResult.status, "VALID");
});

test("missing generator configuration is blocked explicitly", async () => {
  await assert.rejects(
    generateValidatedZugferd({ visualPdf: pdf, ciiXml: xml, generatorUrl: "", generatorToken: "" }),
    (error) => error.code === "EINVOICE_GENERATOR_NOT_CONFIGURED" && error.status === 503,
  );
});

test("mismatching embedded XML hash is rejected", async () => {
  await assert.rejects(
    generateValidatedZugferd({
      visualPdf: pdf,
      ciiXml: xml,
      generatorUrl: "https://generator.example/v1/zugferd",
      generatorToken: "secret-token",
      fetchImpl: async () => new Response(JSON.stringify({
        status: "VALID",
        profile: "EN16931",
        embeddedXmlSha256: "0".repeat(64),
        pdfBase64: pdf.toString("base64"),
      })),
    }),
    (error) => error.code === "EINVOICE_VALIDATION_FAILED" && error.status === 422,
  );
});
