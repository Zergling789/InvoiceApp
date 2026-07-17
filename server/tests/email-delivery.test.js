import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { classifyEmailDeliveryError } from "../emailDelivery.js";

test("treats a failure after SMTP acceptance as sent with a failed status update", () => {
  assert.deepEqual(classifyEmailDeliveryError({ code: "23505" }, true), {
    status: 502,
    code: "EMAIL_SENT_STATUS_UPDATE_FAILED",
    message:
      "Die E-Mail wurde vom Mailserver angenommen, aber der Versand konnte in FreelanceFlow nicht vollständig abgeschlossen werden. Bitte nicht erneut senden und den Status prüfen.",
  });
});

test("classifies SMTP timeouts as an unknown delivery state", () => {
  assert.equal(
    classifyEmailDeliveryError({ code: "ETIMEDOUT" })?.code,
    "EMAIL_SEND_STATUS_UNKNOWN",
  );
  assert.equal(
    classifyEmailDeliveryError({ code: "ESOCKET" })?.status,
    504,
  );
});

test("classifies SMTP authentication and recipient rejection separately", () => {
  assert.equal(
    classifyEmailDeliveryError({ code: "EAUTH" })?.code,
    "EMAIL_PROVIDER_AUTH_FAILED",
  );
  assert.equal(
    classifyEmailDeliveryError({ code: "EENVELOPE" })?.code,
    "EMAIL_RECIPIENT_REJECTED",
  );
  assert.equal(
    classifyEmailDeliveryError({ responseCode: 550 })?.code,
    "EMAIL_RECIPIENT_REJECTED",
  );
});

test("leaves unrelated errors to the existing API error mapping", () => {
  assert.equal(classifyEmailDeliveryError(new Error("database unavailable")), null);
});

test("email route activates delivered offer links and only revokes undelivered links", async () => {
  const source = await readFile(new URL("../index.js", import.meta.url), "utf8");
  const activationBlock = source.match(
    /if \(pendingRecipientLinkId\) \{[\s\S]*?pendingRecipientLinkId = null;/,
  )?.[0];
  const catchBlock = source.match(
    /catch \(err\) \{\s+if \(pendingRecipientLinkId && !mailAccepted\)/,
  )?.[0];

  assert.ok(activationBlock, "delivered offer link activation must remain enabled");
  assert.doesNotMatch(activationBlock, /!mailAccepted/);
  assert.ok(catchBlock, "an accepted email link must not be revoked during error cleanup");
});
