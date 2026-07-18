import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

process.env.SERVER_TEST_MODE = "1";
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.CRON_SECRET;

const { app } = await import("../index.js");

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const protectedRoutes = [
  ["GET", "/api/positions/suggestions"],
  ["GET", "/api/positions/templates"],
  ["POST", "/api/positions/templates"],
  ["PATCH", "/api/positions/templates/00000000-0000-4000-8000-000000000001"],
  ["DELETE", "/api/positions/templates/00000000-0000-4000-8000-000000000001"],
  ["GET", "/api/positions/groups"],
  ["POST", "/api/positions/groups-legacy"],
  ["POST", "/api/positions/groups"],
  ["PATCH", "/api/positions/groups/00000000-0000-4000-8000-000000000001"],
  ["DELETE", "/api/positions/groups/00000000-0000-4000-8000-000000000001"],
  ["POST", "/api/positions/suggestion-events"],
  ["POST", "/api/ai/document-draft"],
  ["POST", "/api/ai/invoice-draft"],
  ["POST", "/api/ai/business-card"],
  ["POST", "/api/pdf"],
  ["POST", "/api/einvoice/cii"],
  ["POST", "/api/einvoice/zugferd"],
  ["POST", "/api/account/export"],
  ["POST", "/api/account/deletion-request"],
  ["POST", "/api/beta/feedback"],
  ["GET", "/api/account/deletion-status"],
  ["POST", "/api/account/deletion-cancel"],
  ["GET", "/api/legal/acceptances"],
  ["POST", "/api/legal/acceptances"],
  ["POST", "/api/documents/offer/00000000-0000-4000-8000-000000000001/recipient-link"],
  ["GET", "/api/billing/status"],
  ["POST", "/api/billing/checkout"],
  ["POST", "/api/billing/portal"],
  ["POST", "/api/pdf/link"],
  ["POST", "/api/invoices/00000000-0000-4000-8000-000000000001/finalize"],
  ["POST", "/api/invoices/00000000-0000-4000-8000-000000000001/mark-sent"],
  ["POST", "/api/invoices/00000000-0000-4000-8000-000000000001/mark-paid"],
  ["POST", "/api/invoices/00000000-0000-4000-8000-000000000001/cancel"],
  ["POST", "/api/sender-identities"],
  ["POST", "/api/sender-identities/00000000-0000-4000-8000-000000000001/resend"],
  ["GET", "/api/sender-identities"],
  ["DELETE", "/api/sender-identities/00000000-0000-4000-8000-000000000001"],
  ["PATCH", "/api/settings/default_sender_identity"],
  ["POST", "/api/test-email"],
  ["POST", "/api/email"],
];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

function assertStableError({ response, body }, expectedStatus, expectedCode) {
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get("content-type")?.startsWith("application/json"), true);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, expectedCode);
  assert.match(body.error.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(response.headers.get("x-request-id"), body.error.requestId);
}

describe("API negative matrix", () => {
  test("every authenticated endpoint rejects a missing session before business logic", async () => {
    for (const [method, path] of protectedRoutes) {
      const result = await request(path, {
        method,
        headers: method === "GET" ? undefined : { "content-type": "application/json" },
        body: method === "GET" ? undefined : "{}",
      });
      assertStableError(result, 401, "unauthorized");
    }
  });

  test("state-changing cross-site requests are rejected before authentication", async () => {
    const result = await request("/api/beta/feedback", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: "{}",
    });
    assertStableError(result, 403, "CROSS_SITE_REQUEST_BLOCKED");
  });

  test("malformed JSON uses the stable API error contract", async () => {
    const result = await request("/api/beta/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    assertStableError(result, 400, "INVALID_JSON");
  });

  test("invalid public recipient tokens disclose no document data", async () => {
    const viewResult = await request("/api/public/documents/invalid");
    assertStableError(viewResult, 404, "RECIPIENT_LINK_INVALID");

    const responseResult = await request("/api/public/offers/invalid/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ response: "ACCEPTED" }),
    });
    assertStableError(responseResult, 404, "RECIPIENT_LINK_INVALID");
  });

  test("internal workers and unsigned webhooks fail closed", async () => {
    const workerResult = await request("/api/internal/account-deletions/process");
    assertStableError(workerResult, 401, "WORKER_UNAUTHORIZED");

    const webhookResult = await request("/api/stripe/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assertStableError(webhookResult, 503, "STRIPE_WEBHOOK_NOT_CONFIGURED");
  });

  test("unknown API routes never return an Express HTML error page", async () => {
    const result = await request("/api/does-not-exist");
    assertStableError(result, 404, "API_NOT_FOUND");
  });
});
