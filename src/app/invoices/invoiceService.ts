import type { Invoice } from "@/types";
import * as repo from "@/data/repositories/invoicesRepo";
import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";

export const listInvoices = (): Promise<Invoice[]> => repo.listInvoices();
export const getInvoice = (id: string) => repo.getInvoice(id);
export const saveInvoice = (invoice: Invoice) => repo.saveInvoice(invoice);
export const deleteInvoice = (id: string) => repo.deleteInvoice(id);
export const removeInvoice = deleteInvoice;

export const finalizeInvoice = async (id: string): Promise<Invoice | null> => {
  const res = await apiFetch(`/api/invoices/${id}/finalize`, { method: "POST" }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    const message = err.message ?? "Rechnung konnte nicht finalisiert werden.";
    const error = new Error(message);
    (error as Error & { code?: string }).code = err.code;
    throw error;
  }
  return getInvoice(id);
};

export const markInvoiceSent = async (id: string): Promise<Invoice | null> => {
  const res = await apiFetch(`/api/invoices/${id}/mark-sent`, { method: "POST" }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    const message = err.message ?? "Rechnung konnte nicht aktualisiert werden.";
    const error = new Error(message);
    (error as Error & { code?: string }).code = err.code;
    throw error;
  }
  return getInvoice(id);
};

export const markInvoicePaid = async (id: string): Promise<Invoice | null> => {
  const res = await apiFetch(`/api/invoices/${id}/mark-paid`, { method: "POST" }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    const message = err.message ?? "Rechnung konnte nicht aktualisiert werden.";
    const error = new Error(message);
    (error as Error & { code?: string }).code = err.code;
    throw error;
  }
  return getInvoice(id);
};

export const cancelInvoice = async (id: string): Promise<Invoice | null> => {
  const res = await apiFetch(`/api/invoices/${id}/cancel`, { method: "POST" }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    const message = err.message ?? "Rechnung konnte nicht storniert werden.";
    const error = new Error(message);
    (error as Error & { code?: string }).code = err.code;
    throw error;
  }
  return getInvoice(id);
};

export const buildDueDate = (startIso: string, days: number) => {
  const start = new Date(startIso);
  const due = new Date(start.getTime() + days * 86400000);
  return due.toISOString().slice(0, 10);
};
