import { describe, expect, it } from "vitest";

import { InvoiceStatus } from "@/types";
import { assessInvoiceReceivable, summarizeReceivables } from "./invoiceReceivables";

const now = new Date("2026-07-28T12:00:00.000Z");

describe("invoice receivables", () => {
  it("classifies overdue, due today and upcoming invoices", () => {
    expect(
      assessInvoiceReceivable({ status: InvoiceStatus.SENT, dueDate: "2026-07-20" }, now),
    ).toMatchObject({ bucket: "overdue", daysUntilDue: -8, needsAttention: true });

    expect(
      assessInvoiceReceivable({ status: InvoiceStatus.ISSUED, dueDate: "2026-07-28" }, now),
    ).toMatchObject({ bucket: "due_today", daysUntilDue: 0, needsAttention: true });

    expect(
      assessInvoiceReceivable({ status: InvoiceStatus.SENT, dueDate: "2026-08-03" }, now),
    ).toMatchObject({ bucket: "due_soon", daysUntilDue: 6, needsAttention: true });
  });

  it("keeps drafts, cancelled and paid invoices out of active receivables", () => {
    expect(assessInvoiceReceivable({ status: InvoiceStatus.DRAFT, dueDate: "2026-07-20" }, now).bucket).toBe("inactive");
    expect(assessInvoiceReceivable({ status: InvoiceStatus.CANCELED, dueDate: "2026-07-20" }, now).bucket).toBe("inactive");
    expect(assessInvoiceReceivable({ status: InvoiceStatus.PAID, dueDate: "2026-07-20" }, now).bucket).toBe("paid");
  });

  it("summarizes attention-relevant invoices", () => {
    expect(
      summarizeReceivables(
        [
          { status: InvoiceStatus.SENT, dueDate: "2026-07-20" },
          { status: InvoiceStatus.SENT, dueDate: "2026-07-28" },
          { status: InvoiceStatus.ISSUED, dueDate: "2026-08-02" },
          { status: InvoiceStatus.SENT, dueDate: "2026-08-20" },
          { status: InvoiceStatus.PAID, dueDate: "2026-07-10" },
        ],
        now,
      ),
    ).toEqual({
      overdue: 1,
      due_today: 1,
      due_soon: 1,
      open: 1,
      paid: 1,
      inactive: 0,
      needsAttention: 3,
    });
  });
});
