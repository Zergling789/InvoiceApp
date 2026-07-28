import { InvoiceStatus, type Invoice } from "@/types";

export type ReceivableBucket = "overdue" | "due_today" | "due_soon" | "open" | "paid" | "inactive";

export type ReceivableAssessment = {
  bucket: ReceivableBucket;
  daysUntilDue: number | null;
  needsAttention: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (value: Date) =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

export function assessInvoiceReceivable(
  invoice: Pick<Invoice, "status" | "dueDate">,
  now = new Date(),
): ReceivableAssessment {
  if (invoice.status === InvoiceStatus.PAID) {
    return { bucket: "paid", daysUntilDue: null, needsAttention: false };
  }

  if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELED) {
    return { bucket: "inactive", daysUntilDue: null, needsAttention: false };
  }

  if (!invoice.dueDate) {
    return { bucket: "open", daysUntilDue: null, needsAttention: false };
  }

  const dueDate = new Date(`${invoice.dueDate}T00:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime())) {
    return { bucket: "open", daysUntilDue: null, needsAttention: false };
  }

  const daysUntilDue = Math.round((startOfUtcDay(dueDate) - startOfUtcDay(now)) / DAY_MS);

  if (daysUntilDue < 0) {
    return { bucket: "overdue", daysUntilDue, needsAttention: true };
  }

  if (daysUntilDue === 0) {
    return { bucket: "due_today", daysUntilDue, needsAttention: true };
  }

  if (daysUntilDue <= 7) {
    return { bucket: "due_soon", daysUntilDue, needsAttention: true };
  }

  return { bucket: "open", daysUntilDue, needsAttention: false };
}

export function summarizeReceivables(
  invoices: Array<Pick<Invoice, "status" | "dueDate">>,
  now = new Date(),
) {
  return invoices.reduce(
    (summary, invoice) => {
      const assessment = assessInvoiceReceivable(invoice, now);
      summary[assessment.bucket] += 1;
      if (assessment.needsAttention) summary.needsAttention += 1;
      return summary;
    },
    {
      overdue: 0,
      due_today: 0,
      due_soon: 0,
      open: 0,
      paid: 0,
      inactive: 0,
      needsAttention: 0,
    },
  );
}
