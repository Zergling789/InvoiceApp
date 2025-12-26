import type { Invoice } from "../types";
import { InvoiceStatus } from "../types";

export function createEmptyInvoice(id: string, clientId = ""): Invoice {
  return {
    id,
    number: "",
    offerId: undefined,
    clientId,
    projectId: undefined,
    date: new Date().toISOString().slice(0, 10),
    dueDate: undefined,
    positions: [],
    vatRate: 0,
    introText: "",
    footerText: "",
    status: InvoiceStatus.DRAFT,
    paymentDate: undefined,
  };
}

export function normalizeInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    clientId: invoice.clientId ?? "",
    date: invoice.date ?? new Date().toISOString().slice(0, 10),
    positions: invoice.positions ?? [],
    vatRate: Number(invoice.vatRate ?? 0),
    introText: invoice.introText ?? "",
    footerText: invoice.footerText ?? "",
    status: invoice.status ?? InvoiceStatus.DRAFT,
  };
}
