import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import { generateZugferd, GeneratorError } from "./generator.mjs";

const port = Number(process.env.PORT ?? 8080);
const maxBodyBytes = Number(process.env.GENERATOR_MAX_BODY_BYTES ?? 22_000_000);
const maxPdfBytes = Number(process.env.GENERATOR_MAX_PDF_BYTES ?? 10_000_000);
const maxXmlBytes = Number(process.env.GENERATOR_MAX_XML_BYTES ?? 5_000_000);
const timeoutMs = Number(process.env.GENERATOR_TIMEOUT_MS ?? 40_000);
const maxConcurrency = Number(process.env.GENERATOR_MAX_CONCURRENCY ?? 2);
const tempRoot = process.env.GENERATOR_TEMP_ROOT ?? "/tmp/einvoice";
const tokens = String(process.env.EINVOICE_GENERATOR_TOKENS ?? process.env.EINVOICE_GENERATOR_TOKEN ?? "").split(",").map((token) => token.trim()).filter(Boolean);
const tools = { java: process.env.JAVA_BIN ?? "java", ghostscript: process.env.GHOSTSCRIPT_BIN ?? "gs", mustangJar: process.env.MUSTANG_JAR ?? "/opt/einvoice/Mustang-CLI-2.24.0.jar", iccProfile: process.env.ICC_PROFILE ?? "/usr/share/color/icc/ghostscript/srgb.icc" };
let active = 0;

const safeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
const authorized = (header) => {
  const supplied = String(header ?? "").replace(/^Bearer\s+/i, "");
  return supplied.length > 0 && tokens.some((token) => safeEqual(supplied, token));
};
const send = (res, status, payload) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" });
  res.end(JSON.stringify(payload));
};
const readJson = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new GeneratorError("REQUEST_TOO_LARGE", "Request is too large.", 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new GeneratorError("REQUEST_INVALID", "Request JSON is invalid.", 400); }
};
const parseRequest = (body) => {
  const keys = Object.keys(body ?? {}).sort().join(",");
  if (keys !== "expectedXmlSha256,profile,requestId,visiblePdfBase64,xmlBase64") throw new GeneratorError("REQUEST_INVALID", "Request shape is invalid.", 400);
  if (body.profile !== "EN16931") throw new GeneratorError("PROFILE_UNSUPPORTED", "Profile is not supported.", 422);
  if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(body.requestId) || !/^[a-f0-9]{64}$/.test(body.expectedXmlSha256)) throw new GeneratorError("REQUEST_INVALID", "Request metadata is invalid.", 400);
  const visiblePdf = Buffer.from(body.visiblePdfBase64, "base64");
  const xml = Buffer.from(body.xmlBase64, "base64");
  if (visiblePdf.length > maxPdfBytes || xml.length > maxXmlBytes) throw new GeneratorError("REQUEST_TOO_LARGE", "Decoded input is too large.", 413);
  return { requestId: body.requestId, visiblePdf, xml, expectedXmlSha256: body.expectedXmlSha256 };
};

await mkdir(tempRoot, { recursive: true });
const server = createServer(async (req, res) => {
  const startedAt = performance.now();
  let requestId = null;
  let code = "OK";
  try {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { status: "ok" });
    if (req.method === "GET" && req.url === "/ready") {
      const ready = tokens.length > 0 && await Promise.all([access(tools.mustangJar), access(tools.iccProfile)]).then(() => true, () => false);
      return send(res, ready ? 200 : 503, { status: ready ? "ready" : "not_ready" });
    }
    if (req.method !== "POST" || req.url !== "/v1/zugferd") return send(res, 404, { code: "NOT_FOUND" });
    if (!authorized(req.headers.authorization)) throw new GeneratorError("GENERATOR_AUTH_INVALID", "Authentication failed.", 401);
    if (active >= maxConcurrency) throw new GeneratorError("GENERATOR_BUSY", "Generator capacity is exhausted.", 503);
    const parsed = parseRequest(await readJson(req));
    requestId = parsed.requestId;
    active += 1;
    try {
      const result = await generateZugferd({ ...parsed, tools, timeoutMs, tempRoot });
      return send(res, 200, { status: "VALID", profile: "EN16931", pdfBase64: result.pdf.toString("base64"), embeddedXmlSha256: result.embeddedXmlSha256, validationCode: "VALID", validationSummary: "PDF/A-3 and embedded XML validated." });
    } finally { active -= 1; }
  } catch (error) {
    code = error instanceof GeneratorError ? error.code : "GENERATOR_INTERNAL_ERROR";
    const status = error instanceof GeneratorError ? error.status : 500;
    return send(res, status, { status: "INVALID", profile: "EN16931", validationCode: code, validationSummary: status >= 500 ? "Generator processing failed." : error.message });
  } finally {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), event: "generator_request", requestId, statusCode: res.statusCode, code, durationMs: Math.round(performance.now() - startedAt) }));
  }
});

server.listen(port, "0.0.0.0", () => console.log(JSON.stringify({ event: "generator_started", port })));
