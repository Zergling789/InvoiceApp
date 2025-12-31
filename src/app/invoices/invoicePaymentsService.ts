import type { InvoicePayment } from "@/types";
import * as repo from "@/data/repositories/invoicePaymentsRepo";
import { getInvoice } from "@/app/invoices/invoiceService";

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const listInvoicePayments = (invoiceId: string): Promise<InvoicePayment[]> =>
  repo.listInvoicePayments(invoiceId);

export async function addInvoicePayment(payment: InvoicePayment): Promise<void> {
  const id = payment.id || newId();
  await repo.addInvoicePayment({
    ...payment,
    id,
    amountCents: Number(payment.amountCents ?? 0),
  });
}

export async function deleteInvoicePayment(id: string, invoiceId: string): Promise<void> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("Rechnung nicht gefunden");
  if (invoice.isLocked) throw new Error("Rechnung ist gesperrt und kann nicht verändert werden");
  await repo.deleteInvoicePayment(id);
}
