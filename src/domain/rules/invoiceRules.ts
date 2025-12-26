import type { Invoice } from "../types";
import { InvoiceStatus } from "../types";

export function calcDueDate(invoiceDate: string, paymentTermsDays: number): string {
  const base = new Date(invoiceDate);
  const ms = Number(paymentTermsDays ?? 0) * 86400000;
  return new Date(base.getTime() + ms).toISOString().slice(0, 10);
}

export function isPaid(status: InvoiceStatus): boolean {
  return status === InvoiceStatus.PAID;
}

export function isOverdue(invoice: Pick<Invoice, "status" | "dueDate">, now = new Date()): boolean {
  if (!invoice.dueDate) return false;
  if (isPaid(invoice.status)) return false;
  return new Date(invoice.dueDate).getTime() < now.getTime();
}
