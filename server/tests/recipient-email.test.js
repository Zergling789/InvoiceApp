import test from "node:test";
import assert from "node:assert/strict";

import { buildOfferRecipientEmail } from "../recipientEmail.js";

test("offer email contains a clickable recipient action and plaintext fallback", () => {
  const url = "https://app.example.test/recipient/secure-token";
  const email = buildOfferRecipientEmail("Guten Tag,\nbitte prüfen.", url);

  assert.match(email.text, /Angebot online ansehen und annehmen/);
  assert.match(email.text, new RegExp(url.replaceAll(".", "\\.")));
  assert.match(email.html, /href="https:\/\/app\.example\.test\/recipient\/secure-token"/);
  assert.match(email.html, /Angebot ansehen und beantworten/);
});

test("offer email escapes user-controlled HTML", () => {
  const email = buildOfferRecipientEmail("<script>alert('x')</script>", "https://example.test/recipient/token");

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});
