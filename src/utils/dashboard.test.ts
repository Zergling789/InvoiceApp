import { describe, expect, it } from "vitest";
import { InvoiceStatus, type Invoice } from "@/types";
import { isInvoiceOpen } from "./dashboard";

const invoice = (status: InvoiceStatus): Invoice => ({
  id: "invoice-1",
  clientId: "client-1",
  number: null,
  date: "2026-07-13",
  dueDate: "2026-07-27",
  positions: [],
  introText: "",
  footerText: "",
  vatRate: 19,
  isSmallBusiness: false,
  status,
  paymentTermsDays: 14,
});

describe("Dashboard-Rechnungsstatus", () => {
  it("behandelt einen Entwurf nicht als offene Forderung", () => {
    expect(isInvoiceOpen(invoice(InvoiceStatus.DRAFT))).toBe(false);
  });

  it("behandelt nur ausgestellte oder versendete Rechnungen als offen", () => {
    expect(isInvoiceOpen(invoice(InvoiceStatus.ISSUED))).toBe(true);
    expect(isInvoiceOpen(invoice(InvoiceStatus.SENT))).toBe(true);
    expect(isInvoiceOpen(invoice(InvoiceStatus.PAID))).toBe(false);
    expect(isInvoiceOpen(invoice(InvoiceStatus.CANCELED))).toBe(false);
  });
});
