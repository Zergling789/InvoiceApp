import { describe, expect, it } from "vitest";

import { InvoiceStatus } from "@/types";
import {
  getSendDialogCopy,
  getSendEmailErrors,
  isEmailDeliveryStatusUnknown,
  supportsEmbeddedPdfPreview,
} from "@/features/documents/SendDocumentModal";

describe("SendDocumentModal rules", () => {
  it("uses a separate PDF view on iPhone and iPad", () => {
    expect(supportsEmbeddedPdfPreview("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile")).toBe(false);
    expect(supportsEmbeddedPdfPreview("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit Mobile/15E148")).toBe(false);
    expect(supportsEmbeddedPdfPreview("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36")).toBe(true);
  });

  it("blocks invalid recipients, missing subjects and missing sender identities", () => {
    expect(
      getSendEmailErrors({
        to: "ungueltig",
        cc: "",
        bcc: "",
        subject: "",
        senderIdentityId: null,
        documentType: "offer",
        documentStatus: "DRAFT",
      }),
    ).toEqual([
      "Empfängeradresse ist ungültig.",
      "Betreff fehlt.",
      "Bitte eine verifizierte Absenderadresse hinterlegen.",
    ]);
  });

  it("requires invoice finalization before normal sending", () => {
    const input = {
      to: "kunde@example.com",
      cc: "",
      bcc: "",
      subject: "Rechnung RE-2026-014",
      senderIdentityId: "sender-1",
      documentType: "invoice" as const,
      documentStatus: InvoiceStatus.DRAFT,
    };

    expect(getSendEmailErrors(input)).toContain("Rechnung muss vor dem Versand finalisiert werden.");
    expect(getSendEmailErrors({ ...input, allowDraftInvoice: true })).toEqual([]);
  });

  it("uses workflow-specific dialog labels", () => {
    expect(getSendDialogCopy("invoice", "reminder").action).toBe("Erinnerung senden");
    expect(getSendDialogCopy("invoice", "dunning").title).toBe("Mahnung senden");
    expect(getSendDialogCopy("offer", "followup").success).toBe("Nachfrage wurde versendet.");
  });

  it("recognizes delivery results with an unknown final status", () => {
    expect(isEmailDeliveryStatusUnknown("EMAIL_SEND_STATUS_UNKNOWN")).toBe(true);
    expect(isEmailDeliveryStatusUnknown("EMAIL_SENT_STATUS_UPDATE_FAILED")).toBe(true);
    expect(isEmailDeliveryStatusUnknown("EMAIL_REJECTED")).toBe(false);
  });
});
