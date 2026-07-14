import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export class GeneratorError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function runTool(command, args, { timeoutMs, cwd }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk) => { stdout = (stdout + chunk).slice(-100_000); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-100_000); });
    child.on("error", reject);
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      if (signal === "SIGKILL") return reject(new GeneratorError("GENERATOR_TIMEOUT", "Generator tool timed out.", 504));
      resolve({ status, stdout, stderr });
    });
  });
}

export async function generateZugferd({ visiblePdf, xml, expectedXmlSha256, tools, timeoutMs = 40_000, tempRoot = "/tmp/einvoice", execute = runTool }) {
  if (visiblePdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new GeneratorError("INVALID_PDF", "Visible document is not a PDF.");
  if (sha256(xml) !== expectedXmlSha256) throw new GeneratorError("XML_HASH_MISMATCH", "XML hash does not match request.");

  const workdir = await mkdtemp(path.join(tempRoot, "request-"));
  const visual = path.join(workdir, "visible.pdf");
  const pdfa = path.join(workdir, "visible-pdfa3.pdf");
  const xmlFile = path.join(workdir, "factur-x.xml");
  const combined = path.join(workdir, "zugferd.pdf");
  const extracted = path.join(workdir, "extracted.xml");
  const pdfaDefinition = path.join(workdir, "pdfa-def.ps");
  try {
    const icc = tools.iccProfile.replaceAll("\\", "/").replaceAll("(", "\\(").replaceAll(")", "\\)");
    const definition = `[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark\n[{icc_PDFA} << /N 3 >> /PUT pdfmark\n[{icc_PDFA} (${icc}) /PUTFILE pdfmark\n[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark\n[{OutputIntent_PDFA} << /Type /OutputIntent /S /GTS_PDFA1 /DestOutputProfile {icc_PDFA} /OutputConditionIdentifier (sRGB) >> /PUT pdfmark\n[{Catalog} << /OutputIntents [{OutputIntent_PDFA}] >> /PUT pdfmark\n`;
    await Promise.all([writeFile(visual, visiblePdf), writeFile(xmlFile, xml), writeFile(pdfaDefinition, definition, "ascii")]);
    const gs = await execute(tools.ghostscript, [
      "-dPDFA=3", "-dBATCH", "-dNOPAUSE", "-dSAFER", "-sDEVICE=pdfwrite",
      "-sColorConversionStrategy=RGB", "-sProcessColorModel=DeviceRGB", "-dPDFACompatibilityPolicy=1",
      `-sOutputFile=${pdfa}`, pdfaDefinition, visual,
    ], { timeoutMs, cwd: workdir });
    if (gs.status !== 0) throw new GeneratorError("PDFA_CONVERSION_FAILED", "PDF/A-3 conversion failed.");

    const javaBase = ["-jar", tools.mustangJar];
    const combine = await execute(tools.java, [...javaBase, "--action", "combine", "--source", pdfa, "--source-xml", xmlFile, "--out", combined, "--format", "zf", "--version", "2", "--profile", "E", "--ignorefileextension", "--no-additional-attachments"], { timeoutMs, cwd: workdir });
    if (combine.status !== 0) throw new GeneratorError("EMBEDDING_FAILED", "XML embedding failed.");

    const validation = await execute(tools.java, [...javaBase, "--action", "validate", "--source", combined, "--no-notices", "--disable-file-logging"], { timeoutMs, cwd: workdir });
    if (validation.status !== 0 || !validation.stdout.includes('<summary status="valid"/>')) throw new GeneratorError("VALIDATION_FAILED", "Mustang validation failed.");

    const extract = await execute(tools.java, [...javaBase, "--action", "extract", "--source", combined, "--out", extracted], { timeoutMs, cwd: workdir });
    if (extract.status !== 0) throw new GeneratorError("XML_EXTRACTION_FAILED", "Embedded XML could not be extracted.");
    const [pdf, embeddedXml] = await Promise.all([readFile(combined), readFile(extracted)]);
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new GeneratorError("OUTPUT_PDF_INVALID", "Generated output is not a PDF.");
    const embeddedXmlSha256 = sha256(embeddedXml);
    if (embeddedXmlSha256 !== expectedXmlSha256) throw new GeneratorError("EMBEDDED_XML_MISMATCH", "Embedded XML differs from input.");
    return { pdf, embeddedXmlSha256 };
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}
