import { describe, expect, it } from "vitest";
import { Invoice, InvoiceStatus, Offer, OfferStatus } from "@/types";
import { getDocumentCapabilities, getInvoicePhase, getOfferPhase } from "./documentState";

const baseInvoice: Invoice = {
  id: "inv-1",
  number: "INV-1",
  clientId: "client-1",
  date: "2024-01-01",
  paymentTermsDays: 14,
  positions: [],
  vatRate: 0,
  introText: "",
  footerText: "",
  status: InvoiceStatus.DRAFT,
};

const baseOffer: Offer = {
  id: "offer-1",
  number: "OFF-1",
  clientId: "client-1",
  currency: "EUR",
  date: "2024-01-01",
  positions: [],
  vatRate: 0,
  introText: "",
  footerText: "",
  status: OfferStatus.DRAFT,
};

describe("documentState", () => {
  it("derives invoice phases in priority order", () => {
    expect(getInvoicePhase({ ...baseInvoice, status: InvoiceStatus.CANCELED })).toBe("canceled");
    expect(getInvoicePhase({ ...baseInvoice, paymentDate: "2024-01-10" })).toBe("paid");
    expect(
      getInvoicePhase({ ...baseInvoice, dueDate: "2024-01-05", status: InvoiceStatus.SENT }, new Date("2024-01-10"))
    ).toBe("overdue");
    expect(
      getInvoicePhase({ ...baseInvoice, dueDate: "2024-01-05", status: InvoiceStatus.ISSUED }, new Date("2024-01-10"))
    ).toBe("overdue");
    expect(getInvoicePhase({ ...baseInvoice, isOverdue: true, status: InvoiceStatus.ISSUED })).toBe("overdue");
    expect(getInvoicePhase({ ...baseInvoice, sentAt: "2024-01-03", status: InvoiceStatus.ISSUED })).toBe("sent");
    expect(getInvoicePhase({ ...baseInvoice, status: InvoiceStatus.ISSUED })).toBe("issued");
    expect(getInvoicePhase(baseInvoice)).toBe("draft");
  });

  it("derives offer phases", () => {
    expect(getOfferPhase({ ...baseOffer, status: OfferStatus.INVOICED })).toBe("invoiced");
    expect(getOfferPhase({ ...baseOffer, status: OfferStatus.ACCEPTED })).toBe("accepted");
    expect(getOfferPhase({ ...baseOffer, status: OfferStatus.REJECTED })).toBe("rejected");
    expect(getOfferPhase({ ...baseOffer, status: OfferStatus.SENT })).toBe("sent");
    expect(getOfferPhase(baseOffer)).toBe("draft");
  });

  it("calculates invoice capabilities", () => {
    const draftCaps = getDocumentCapabilities("invoice", baseInvoice);
    expect(draftCaps.canEdit).toBe(true);
    expect(draftCaps.canFinalize).toBe(true);
    expect(draftCaps.canSend).toBe(false);

    const overdueCaps = getDocumentCapabilities(
      "invoice",
      { ...baseInvoice, status: InvoiceStatus.SENT, dueDate: "2024-01-01" },
      new Date("2024-02-01")
    );
    expect(overdueCaps.canSend).toBe(true);
    expect(overdueCaps.canSendDunning).toBe(true);
    expect(overdueCaps.canMarkPaid).toBe(true);
    expect(overdueCaps.canCancel).toBe(true);

    const canceledCaps = getDocumentCapabilities("invoice", {
      ...baseInvoice,
      status: InvoiceStatus.CANCELED,
    });
    expect(canceledCaps.canMarkPaid).toBe(false);
    expect(canceledCaps.canCancel).toBe(false);
  });

  it("calculates offer capabilities", () => {
    const acceptedCaps = getDocumentCapabilities("offer", { ...baseOffer, status: OfferStatus.ACCEPTED });
    expect(acceptedCaps.canConvertToInvoice).toBe(true);
    expect(acceptedCaps.canSend).toBe(false);

    const sentCaps = getDocumentCapabilities("offer", { ...baseOffer, status: OfferStatus.SENT });
    expect(sentCaps.canAccept).toBe(true);
    expect(sentCaps.canReject).toBe(true);
  });
});
