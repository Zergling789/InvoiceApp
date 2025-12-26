import { spawn } from "node:child_process";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const PORT = 4123;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let serverProcess;

async function waitForServer() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not start in time");
}

before(async () => {
  serverProcess = spawn("node", ["server/index.js"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

test("oversize payload returns 413", async () => {
  const largeBase64 = "A".repeat(10 * 1024 * 1024);
  const res = await fetch(`${BASE_URL}/api/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "test@example.com",
      subject: "Hi",
      message: "Hello",
      pdfBase64: largeBase64,
      filename: "test.pdf",
      senderIdentityId: "id",
    }),
  });

  assert.equal(res.status, 413);
  const body = await res.json();
  assert.equal(body.error?.code, "payload_too_large");
});

test("rate limit triggers on 11th request", async () => {
  let lastRes;
  for (let i = 0; i < 11; i += 1) {
    const res = await fetch(`${BASE_URL}/api/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    lastRes = res;
  }

  assert.equal(lastRes.status, 429);
  const body = await lastRes.json();
  assert.equal(body.error?.code, "RATE_LIMIT");
  assert.ok(Number.isFinite(body.error?.retryAfterSeconds));
});