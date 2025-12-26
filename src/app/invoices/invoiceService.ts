import type { Invoice } from "@/types";
import * as repo from "@/data/repositories/invoicesRepo";

export const listInvoices = (): Promise<Invoice[]> => repo.listInvoices();
export const getInvoice = (id: string) => repo.getInvoice(id);
export const saveInvoice = (invoice: Invoice) => repo.saveInvoice(invoice);
export const deleteInvoice = (id: string) => repo.deleteInvoice(id);
export const removeInvoice = deleteInvoice;

export const buildDueDate = (startIso: string, days: number) => {
  const start = new Date(startIso);
  const due = new Date(start.getTime() + days * 86400000);
  return due.toISOString().slice(0, 10);
};
