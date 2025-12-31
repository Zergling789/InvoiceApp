import type { InvoicePayment } from "../types";

export function normalizeInvoicePayment(payment: InvoicePayment): InvoicePayment {
  return {
    ...payment,
    amountCents: Number(payment.amountCents ?? 0),
    currency: payment.currency ?? "EUR",
    paidAt: payment.paidAt ?? new Date().toISOString(),
    method: payment.method ?? null,
    note: payment.note ?? null,
    createdAt: payment.createdAt ?? null,
  };
}
