import assert from "node:assert/strict";
import test from "node:test";
import { buildEpcQrPayload, createEpcQrDataUrl } from "../paymentQr.js";

const input = { beneficiary: "FreelanceFlow GmbH", iban: "DE89370400440532013000", bic: "COBADEFFXXX", amount: 119, reference: "Rechnung RE-2026-001" };

test("EPC payment QR contains validated invoice payment data", async () => {
  const payload = buildEpcQrPayload(input);
  assert.match(payload, /^BCD\n002\n1\nSCT\nCOBADEFFXXX/);
  assert.match(payload, /EUR119\.00/);
  assert.match(payload, /Rechnung RE-2026-001/);
  assert.match(await createEpcQrDataUrl(input), /^data:image\/png;base64,/);
});

test("EPC payment QR rejects invalid account and amount data", () => {
  assert.throws(() => buildEpcQrPayload({ ...input, iban: "DE00INVALID" }), error => error.code === "PAYMENT_QR_IBAN_INVALID");
  assert.throws(() => buildEpcQrPayload({ ...input, amount: 0 }), error => error.code === "PAYMENT_QR_AMOUNT_INVALID");
});
