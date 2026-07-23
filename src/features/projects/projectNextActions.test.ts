import { describe, expect, it } from "vitest";

import type { Project } from "@/types";
import { InvoiceStatus, OfferStatus } from "@/types";
import { getSuggestedNextAction } from "./projectNextActions";

const project = (phase: Project["phase"]): Project => ({
  id: "project-1",
  name: "Garten Schmidt",
  budgetType: "fixed",
  hourlyRate: 0,
  budgetTotal: 0,
  status: "active",
  phase,
  priority: "normal",
});

describe("project next-action rules", () => {
  it("suggests following up a quote after seven days", () => {
    const action = getSuggestedNextAction({
      project: project("quote_sent"),
      offers: [{
        id: "offer-1", number: "AN-1", clientId: "client-1", currency: "EUR",
        date: "2026-07-01", positions: [], vatRate: 19, introText: "", footerText: "",
        status: OfferStatus.SENT, sentAt: "2026-07-10T10:00:00Z",
      }],
      invoices: [],
      now: new Date("2026-07-18T10:00:00Z"),
    });
    expect(action?.type).toBe("follow_up_quote");
  });

  it("prioritizes an overdue invoice", () => {
    const action = getSuggestedNextAction({
      project: project("payment_pending"),
      offers: [],
      invoices: [{
        id: "invoice-1", number: "RE-1", clientId: "client-1", date: "2026-07-01",
        dueDate: "2026-07-10", paymentTermsDays: 9, positions: [], vatRate: 19,
        introText: "", footerText: "", status: InvoiceStatus.SENT, currency: "EUR", isSmallBusiness: false,
        sellerCountry: "DE", customerCountry: "DE", customerType: "BUSINESS", serviceCountry: "DE",
      }],
      now: new Date("2026-07-18T10:00:00Z"),
    });
    expect(action?.type).toBe("follow_up_payment");
  });

  it("suggests invoicing at project completion", () => {
    expect(getSuggestedNextAction({ project: project("completion"), offers: [], invoices: [] })?.type).toBe("create_invoice");
  });
});
