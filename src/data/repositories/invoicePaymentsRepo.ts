import type { InvoicePayment } from "@/domain/types";
import { normalizeInvoicePayment } from "@/domain/models/InvoicePayment";
import {
  dbAddInvoicePayment,
  dbDeleteInvoicePayment,
  dbListInvoicePayments,
} from "@/db/invoicePaymentsDb";

export async function listInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const payments = await dbListInvoicePayments(invoiceId);
  return payments.map(normalizeInvoicePayment);
}

export async function addInvoicePayment(payment: InvoicePayment): Promise<void> {
  await dbAddInvoicePayment(normalizeInvoicePayment(payment));
}

export async function deleteInvoicePayment(id: string): Promise<void> {
  await dbDeleteInvoicePayment(id);
}
