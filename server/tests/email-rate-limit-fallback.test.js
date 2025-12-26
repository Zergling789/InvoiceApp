import { spawn } from "node:child_process";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const PORT = 4125;
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
      REDIS_URL: "redis://127.0.0.1:6380",
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

test("redis down falls back to in-memory", async () => {
  let lastRes;
  for (let i = 0; i < 3; i += 1) {
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
});
