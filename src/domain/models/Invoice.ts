import type { Invoice } from "../types";
import { InvoiceStatus } from "../types";

export function createEmptyInvoice(id: string, clientId = ""): Invoice {
  return {
    id,
    number: null,
    offerId: undefined,
    clientId,
    projectId: undefined,
    date: new Date().toISOString().slice(0, 10),
    dueDate: undefined,
    positions: [],
    vatRate: 0,
    isSmallBusiness: false,
    smallBusinessNote: null,
    introText: "",
    footerText: "",
    status: InvoiceStatus.DRAFT,
    paymentDate: undefined,
    isLocked: false,
    finalizedAt: null,
    sentAt: null,
    lastSentAt: null,
    lastSentTo: null,
    sentCount: 0,
    sentVia: null,
  };
}

export function normalizeInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    number: invoice.number ?? null,
    clientId: invoice.clientId ?? "",
    date: invoice.date ?? new Date().toISOString().slice(0, 10),
    positions: invoice.positions ?? [],
    vatRate: Number(invoice.vatRate ?? 0),
    isSmallBusiness: invoice.isSmallBusiness ?? false,
    smallBusinessNote: invoice.smallBusinessNote ?? null,
    introText: invoice.introText ?? "",
    footerText: invoice.footerText ?? "",
    status: invoice.status ?? InvoiceStatus.DRAFT,
    isLocked: invoice.isLocked ?? false,
    finalizedAt: invoice.finalizedAt ?? null,
    sentAt: invoice.sentAt ?? null,
    lastSentAt: invoice.lastSentAt ?? null,
    lastSentTo: invoice.lastSentTo ?? null,
    sentCount: invoice.sentCount ?? 0,
    sentVia: invoice.sentVia ?? null,
  };
}
