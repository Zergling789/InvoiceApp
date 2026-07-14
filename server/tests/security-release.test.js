import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Vercel security headers include CSP, HSTS and clickjacking protection", async () => {
  const config = JSON.parse(await readFile(new URL("../../vercel.json", import.meta.url), "utf8"));
  const headers = Object.fromEntries(config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.match(headers["content-security-policy"], /object-src 'none'/);
  assert.match(headers["strict-transport-security"], /max-age=31536000/);
  assert.equal(headers["x-frame-options"], "DENY");
});

test("server blocks explicit cross-site state-changing requests", async () => {
  const source = await readFile(new URL("../index.js", import.meta.url), "utf8");
  assert.match(source, /CROSS_SITE_REQUEST_BLOCKED/);
  assert.match(source, /fetchSite === "cross-site"/);
  assert.doesNotMatch(source, /VITE_SUPABASE_SERVICE_ROLE/);
  assert.match(source, /IS_PROD \|\| !origin/);
  assert.match(source, /hostname === "localhost"/);
});
