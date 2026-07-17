import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  DOCUMENT_DRAFT_CONTRACT_VERSION,
  DOCUMENT_INTAKE_SOURCE_KINDS,
  normalizeDocumentDraftIntake,
} from "../ai/documentIntake.js";

test("document intake normalizes the versioned text source", () => {
  assert.equal(DOCUMENT_DRAFT_CONTRACT_VERSION, 1);
  assert.deepEqual(
    normalizeDocumentDraftIntake({ source: { kind: "TEXT", text: "  Terrasse pflastern  " } }),
    { sourceKind: "TEXT", description: "Terrasse pflastern" },
  );
});

test("document intake keeps the legacy description request compatible", () => {
  assert.deepEqual(normalizeDocumentDraftIntake({ description: "Zaun montieren" }), {
    sourceKind: "TEXT",
    description: "Zaun montieren",
  });
});

test("known future sources are explicit but fail closed", () => {
  for (const kind of DOCUMENT_INTAKE_SOURCE_KINDS.filter((entry) => entry !== "TEXT")) {
    assert.throws(
      () => normalizeDocumentDraftIntake({ source: { kind, text: "Inhalt" } }),
      (error) => error.code === "AI_SOURCE_NOT_SUPPORTED" && error.status === 422,
    );
  }
  assert.throws(
    () => normalizeDocumentDraftIntake({ source: { kind: "CHAT", text: "Inhalt" } }),
    (error) => error.code === "AI_SOURCE_INVALID",
  );
});

test("invalid text input is rejected before usage is consumed", async () => {
  assert.throws(
    () => normalizeDocumentDraftIntake({ source: { kind: "TEXT", text: " " } }),
    (error) => error.code === "AI_INPUT_REQUIRED",
  );
  assert.throws(
    () => normalizeDocumentDraftIntake({ source: { kind: "TEXT", text: "x".repeat(4001) } }),
    (error) => error.code === "AI_INPUT_TOO_LONG",
  );

  const source = await readFile(new URL("../index.js", import.meta.url), "utf8");
  const handler = source.match(
    /const handleDocumentDraft = async[\s\S]*?app\.post\(\s*\["\/api\/ai\/document-draft"/,
  )?.[0] ?? "";
  assert.ok(handler.indexOf("normalizeDocumentDraftIntake") < handler.indexOf("incrementUsage"));
  assert.match(handler, /contractVersion: DOCUMENT_DRAFT_CONTRACT_VERSION/);
});

test("business card payload validation happens before usage is consumed", async () => {
  const source = await readFile(new URL("../index.js", import.meta.url), "utf8");
  const route = source.match(
    /app\.post\("\/api\/ai\/business-card"[\s\S]*?app\.post\("\/api\/pdf"/,
  )?.[0] ?? "";
  assert.ok(route.indexOf("validateBusinessCardImage") < route.indexOf("incrementUsage"));
});
