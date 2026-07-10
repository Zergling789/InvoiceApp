import { test } from "node:test";
import assert from "node:assert/strict";

import { extractBusinessCard, validateBusinessCardImage } from "../ai/businessCard.js";

const imageDataUrl = `data:image/jpeg;base64,${Buffer.alloc(256, 1).toString("base64")}`;

test("business card image validation rejects unsupported and oversized input", () => {
  assert.throws(() => validateBusinessCardImage("data:image/svg+xml;base64,AAAA"), /Unsupported/);
  const oversized = `data:image/jpeg;base64,${Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64")}`;
  assert.throws(() => validateBusinessCardImage(oversized), /size/);
});

test("business card extraction uses image input, no storage, and structured output", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "test-vision-model";
  let request;
  const expected = { companyName: "Acme GmbH", contactPerson: "Ada Beispiel", email: "ada@example.com", phone: "+49 123", website: "https://example.com", address: "Straße 1\n12345 Berlin", jobTitle: "CEO", notes: "", warnings: [] };
  try {
    const result = await extractBusinessCard({
      imageDataUrl,
      userId: "user-1",
      client: { responses: { parse: async (payload) => { request = payload; return { output_parsed: expected }; } } },
    });
    assert.deepEqual(result, expected);
    assert.equal(request.store, false);
    assert.equal(request.input[0].content[1].type, "input_image");
    assert.equal(request.input[0].content[1].image_url, imageDataUrl);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = previousModel;
  }
});
