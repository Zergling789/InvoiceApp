import { spawn } from "node:child_process";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const PORT = 4124;
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
    env: {
      ...process.env,
      PORT: String(PORT),
      EMAIL_RATE_LIMIT: "2",
      EMAIL_RATE_WINDOW_MS: "1000",
    },
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

test("rate limit resets after window", async () => {
  const res1 = await fetch(`${BASE_URL}/api/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const res2 = await fetch(`${BASE_URL}/api/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const res3 = await fetch(`${BASE_URL}/api/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.notEqual(res1.status, 429);
  assert.notEqual(res2.status, 429);
  assert.equal(res3.status, 429);

  await new Promise((r) => setTimeout(r, 1100));

  const res4 = await fetch(`${BASE_URL}/api/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.notEqual(res4.status, 429);
});
