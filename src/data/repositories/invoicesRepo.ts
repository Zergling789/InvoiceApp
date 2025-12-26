import type { Invoice } from "@/domain/types";
import { normalizeInvoice } from "@/domain/models/Invoice";
import { dbDeleteInvoice, dbGetInvoice, dbListInvoices, dbUpsertInvoice } from "@/db/invoicesDb";

export async function listInvoices(): Promise<Invoice[]> {
  const invoices = await dbListInvoices();
  return invoices.map(normalizeInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const invoice = await dbGetInvoice(id);
  return invoice ? normalizeInvoice(invoice) : null;
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  await dbUpsertInvoice(normalizeInvoice(invoice));
}

export async function deleteInvoice(id: string): Promise<void> {
  await dbDeleteInvoice(id);
}
