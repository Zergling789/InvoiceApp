import crypto from "node:crypto";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export class EinvoiceGenerationError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "EinvoiceGenerationError";
    this.code = code;
    this.status = status;
  }
}

export async function generateValidatedZugferd({
  visualPdf,
  ciiXml,
  generatorUrl = process.env.EINVOICE_GENERATOR_URL,
  generatorToken = process.env.EINVOICE_GENERATOR_TOKEN,
  fetchImpl = fetch,
  timeoutMs = 45_000,
}) {
  if (!generatorUrl || !generatorToken) {
    throw new EinvoiceGenerationError(
      "EINVOICE_GENERATOR_NOT_CONFIGURED",
      "The electronic invoice generator is not configured.",
      503,
    );
  }

  const xmlHash = sha256(Buffer.from(ciiXml, "utf8"));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(generatorUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${generatorToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        format: "ZUGFERD",
        profile: "EN16931",
        version: "2",
        pdfBase64: Buffer.from(visualPdf).toString("base64"),
        xmlBase64: Buffer.from(ciiXml, "utf8").toString("base64"),
        xmlSha256: xmlHash,
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
    throw new EinvoiceGenerationError("EINVOICE_GENERATION_FAILED", `Generator returned HTTP ${response.status}.`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new EinvoiceGenerationError("EINVOICE_GENERATION_FAILED", "Generator returned invalid JSON.");
  }

  if (result?.status !== "VALID" || result?.profile !== "EN16931" || result?.embeddedXmlSha256 !== xmlHash) {
    throw new EinvoiceGenerationError("EINVOICE_VALIDATION_FAILED", "Generator validation or embedded XML verification failed.", 422);
  }

  const pdf = Buffer.from(String(result.pdfBase64 ?? ""), "base64");
  if (pdf.length < 5 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new EinvoiceGenerationError("EINVOICE_GENERATION_FAILED", "Generator returned no valid PDF document.");
  }

  return {
    pdf,
    contentHash: sha256(pdf),
    xmlHash,
    validationResult: {
      validator: String(result.validator ?? "external"),
      status: "VALID",
      profile: "EN16931",
      pdfaLevel: String(result.pdfaLevel ?? "PDF/A-3"),
      embeddedXmlSha256: xmlHash,
    },
  };
}
