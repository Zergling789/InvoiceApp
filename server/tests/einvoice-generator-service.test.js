import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { generateZugferd } from "../../services/einvoice-generator/generator.mjs";

const pdf = Buffer.from("%PDF-1.7\nvisible");
const xml = Buffer.from("<rsm:CrossIndustryInvoice />");
const hash = createHash("sha256").update(xml).digest("hex");

test("generator validates the embedded XML byte-for-byte and removes request files", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "generator-test-"));
  const execute = async (_command, args) => {
    const action = args[args.indexOf("--action") + 1];
    if (action === "combine") {
      const out = args[args.indexOf("--out") + 1];
      await writeFile(out, pdf);
    }
    if (action === "extract") {
      const out = args[args.indexOf("--out") + 1];
      await writeFile(out, xml);
    }
    if (!action) {
      const output = args.find((arg) => arg.startsWith("-sOutputFile=")).slice(13);
      await writeFile(output, pdf);
    }
    return { status: 0, stdout: action === "validate" ? '<summary status="valid"/>' : "", stderr: "" };
  };
  try {
    const result = await generateZugferd({ visiblePdf: pdf, xml, expectedXmlSha256: hash, tools: { java: "java", ghostscript: "gs", mustangJar: "mustang.jar", iccProfile: "/icc/srgb.icc" }, tempRoot, execute });
    assert.equal(result.embeddedXmlSha256, hash);
    assert.equal((await readdir(tempRoot)).length, 0);
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
});

test("generator rejects corrupt PDFs and wrong input hashes without creating output", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "generator-test-"));
  try {
    await assert.rejects(generateZugferd({ visiblePdf: Buffer.from("broken"), xml, expectedXmlSha256: hash, tools: {}, tempRoot }), (error) => error.code === "INVALID_PDF");
    await assert.rejects(generateZugferd({ visiblePdf: pdf, xml, expectedXmlSha256: "0".repeat(64), tools: {}, tempRoot }), (error) => error.code === "XML_HASH_MISMATCH");
    assert.equal((await readdir(tempRoot)).length, 0);
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
});

test("HTTP service enforces constant-time auth, request limits and bounded concurrency", async () => {
  const source = await readFile(new URL("../../services/einvoice-generator/server.mjs", import.meta.url), "utf8");
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /GENERATOR_MAX_BODY_BYTES/);
  assert.match(source, /GENERATOR_MAX_PDF_BYTES/);
  assert.match(source, /GENERATOR_MAX_XML_BYTES/);
  assert.match(source, /active >= maxConcurrency/);
  assert.match(source, /GENERATOR_AUTH_INVALID/);
  assert.match(source, /PROFILE_UNSUPPORTED/);
});
