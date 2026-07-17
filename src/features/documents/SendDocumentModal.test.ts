import { describe, expect, it } from "vitest";

import {
  getSendDialogCopy,
  getSendEmailErrors,
  isEmailDeliveryStatusUnknown,
} from "@/features/documents/SendDocumentModal";
import { InvoiceStatus } from "@/types";

const validFields = {
  to: "kunde@example.de",
  cc: "",
  bcc: "",
  subject: "Rechnung RE-2026-001",
  senderIdentityId: "sender-1",
  documentType: "invoice" as const,
  documentStatus: InvoiceStatus.DRAFT,
};

describe("send document workflow", () => {
  it("validates a draft for direct sending but allows finalizing and sending", () => {
    expect(getSendEmailErrors(validFields)).toContain(
      "Rechnung muss vor dem Versand finalisiert werden.",
    );
    expect(getSendEmailErrors({ ...validFields, allowDraftInvoice: true })).toEqual([]);
    expect(getSendEmailErrors({
      ...validFields,
      documentStatus: InvoiceStatus.ISSUED,
    })).toEqual([]);
  });

  it("uses task-specific wording for reminders, dunning and offer follow-ups", () => {
    expect(getSendDialogCopy("invoice", "reminder").title).toBe("Zahlungserinnerung senden");
    expect(getSendDialogCopy("invoice", "dunning").action).toBe("Mahnung senden");
    expect(getSendDialogCopy("offer", "followup").action).toBe("Nachfrage senden");
  });

  it("keeps address, subject and sender validation before finalization", () => {
    expect(getSendEmailErrors({
      ...validFields,
      to: "keine-mailadresse",
      subject: "",
      senderIdentityId: null,
      allowDraftInvoice: true,
    })).toEqual([
      "Empfängeradresse ist ungültig.",
      "Betreff fehlt.",
      "Bitte eine verifizierte Absenderadresse hinterlegen.",
    ]);
  });

  it("locks resending only when delivery may already have happened", () => {
    expect(isEmailDeliveryStatusUnknown("EMAIL_SEND_STATUS_UNKNOWN")).toBe(true);
    expect(isEmailDeliveryStatusUnknown("EMAIL_SENT_STATUS_UPDATE_FAILED")).toBe(true);
    expect(isEmailDeliveryStatusUnknown("EMAIL_RECIPIENT_REJECTED")).toBe(false);
  });
});
