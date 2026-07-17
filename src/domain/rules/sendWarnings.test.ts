import { describe, expect, it } from "vitest";

import { getSendWarnings } from "./sendWarnings";
import { InvoiceStatus, type Invoice, type UserSettings } from "@/types";

const invoice = { id: "inv-1", status: InvoiceStatus.ISSUED } as Invoice;
const settings = { iban: "DE89370400440532013000", bic: "INVALID" } as UserSettings;

describe("send warnings", () => {
  it("explains that an invalid optional BIC is omitted from the payment QR", () => {
    expect(getSendWarnings({ documentType: "invoice", document: invoice, client: undefined, settings })).toContain(
      "Die gespeicherte BIC ist ungültig. Der Zahlungs-QR wird ohne BIC erstellt.",
    );
  });
});
