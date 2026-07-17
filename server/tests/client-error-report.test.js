import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { normalizeClientRoute, parseClientErrorReport } from "../clientErrorReport.js";

const errorId = "41968d9d-d552-4a6b-8f84-ae5c97a98b34";

test("client reports accept only the stable contract", () => {
  assert.deepEqual(
    parseClientErrorReport({ errorId, kind: "UNHANDLED_ERROR", route: "/app/documents" }),
    { errorId, kind: "UNHANDLED_ERROR", route: "/app/documents" },
  );
  assert.throws(
    () => parseClientErrorReport({ errorId: "no-id", kind: "UNHANDLED_ERROR", route: "/app" }),
    (error) => error.code === "CLIENT_ERROR_REPORT_INVALID" && error.status === 400,
  );
  assert.throws(
    () => parseClientErrorReport({ errorId, kind: "RAW_STACK", route: "/app" }),
    (error) => error.code === "CLIENT_ERROR_REPORT_INVALID",
  );
});

test("client routes redact recipient tokens and opaque identifiers", () => {
  assert.equal(normalizeClientRoute("/recipient/secret-public-token?ignored=yes"), "/recipient/:token");
  assert.equal(
    normalizeClientRoute(`/app/documents/invoice/${errorId}`),
    "/app/documents/invoice/:id",
  );
  assert.equal(
    normalizeClientRoute("/app/documents/abcdefghijklmnopqrstuvwxyz123456"),
    "/app/documents/:id",
  );
});

test("client error endpoint logs only normalized metadata", async () => {
  const source = await readFile(new URL("../index.js", import.meta.url), "utf8");
  const route = source.match(/app\.post\("\/api\/client-errors"[\s\S]*?app\.get\("\/api\/health"/)?.[0] ?? "";
  assert.match(route, /parseClientErrorReport\(req\.body\)/);
  assert.match(route, /clientErrorId: report\.errorId/);
  assert.match(route, /clientRoute: report\.route/);
  assert.doesNotMatch(route, /req\.body\.(error|message|stack)/);
});
