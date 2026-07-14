import crypto from "node:crypto";
import { z } from "zod";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const base64Schema = z.string().min(8).regex(/^[A-Za-z0-9+/]+={0,2}$/);

export const zugferdGeneratorResponseSchema = z.object({
  status: z.enum(["VALID", "INVALID"]),
  profile: z.literal("EN16931"),
  pdfBase64: base64Schema.optional(),
  embeddedXmlSha256: sha256Schema.optional(),
  validationCode: z.string().trim().min(1).max(100).optional(),
  validationSummary: z.string().trim().min(1).max(1000).optional(),
}).strict();

export class EinvoiceGenerationError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "EinvoiceGenerationError";
    this.code = code;
    this.status = status;
  }
}

export async function generateValidatedZugferd({
  requestId = crypto.randomUUID(),
  visualPdf,
  ciiXml,
  generatorUrl = process.env.EINVOICE_GENERATOR_URL,
  generatorToken = process.env.EINVOICE_GENERATOR_TOKEN,
  fetchImpl = fetch,
  timeoutMs = 45_000,
}) {
  if (!generatorUrl || !generatorToken) {
    throw new EinvoiceGenerationError("EINVOICE_GENERATOR_NOT_CONFIGURED", "The electronic invoice generator is not configured.", 503);
  }
  if (!Buffer.isBuffer(visualPdf) || visualPdf.length < 5 || visualPdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new EinvoiceGenerationError("EINVOICE_INPUT_INVALID", "The visible invoice is not a PDF document.", 422);
  }

  const xmlBuffer = Buffer.from(ciiXml, "utf8");
  const xmlHash = sha256(xmlBuffer);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(generatorUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${generatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        requestId: String(requestId),
        visiblePdfBase64: visualPdf.toString("base64"),
        xmlBase64: xmlBuffer.toString("base64"),
        expectedXmlSha256: xmlHash,
        profile: "EN16931",
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const code = error?.name === "AbortError" ? "EINVOICE_GENERATION_TIMEOUT" : "EINVOICE_GENERATION_FAILED";
    throw new EinvoiceGenerationError(code, "The electronic invoice generator could not be reached.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const code = response.status === 401 ? "EINVOICE_GENERATOR_AUTH_FAILED" : response.status === 413 ? "EINVOICE_REQUEST_TOO_LARGE" : "EINVOICE_GENERATION_FAILED";
    throw new EinvoiceGenerationError(code, `Generator returned HTTP ${response.status}.`, response.status === 401 ? 502 : response.status);
  }

  let result;
  try {
    result = zugferdGeneratorResponseSchema.parse(await response.json());
  } catch {
    throw new EinvoiceGenerationError("EINVOICE_GENERATOR_RESPONSE_INVALID", "Generator returned an invalid response.");
  }

  if (result.status !== "VALID" || result.embeddedXmlSha256 !== xmlHash || !result.pdfBase64) {
    throw new EinvoiceGenerationError("EINVOICE_VALIDATION_FAILED", "Generator validation or embedded XML verification failed.", 422);
  }

  const pdf = Buffer.from(result.pdfBase64, "base64");
  if (pdf.length < 5 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new EinvoiceGenerationError("EINVOICE_GENERATOR_RESPONSE_INVALID", "Generator returned no valid PDF document.");
  }

  return {
    pdf,
    contentHash: sha256(pdf),
    xmlHash,
    validationResult: {
      status: "VALID",
      profile: "EN16931",
      validationCode: result.validationCode ?? "VALID",
      validationSummary: result.validationSummary ?? "Generator validation successful.",
      embeddedXmlSha256: xmlHash,
    },
  };
}
