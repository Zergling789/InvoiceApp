import { Invoice, InvoiceStatus, Offer, OfferStatus } from "@/types";
import { getInvoicePhase, getOfferPhase } from "@/features/documents/state/documentState";
import { formatInvoicePhaseLabel, formatOfferPhaseLabel } from "@/features/documents/state/formatPhaseLabel";

const buildInvoiceForPhase = (status: InvoiceStatus, isOverdue: boolean): Invoice => {
  const now = new Date();
  const overdueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  return {
    id: "status-placeholder",
    number: "STATUS",
    clientId: "status-placeholder",
    date: now.toISOString(),
    dueDate: isOverdue ? overdueDate : undefined,
    positions: [],
    vatRate: 0,
    introText: "",
    footerText: "",
    status,
  };
};

const buildOfferForPhase = (status: OfferStatus): Offer => ({
  id: "status-placeholder",
  number: "STATUS",
  clientId: "status-placeholder",
  date: new Date().toISOString(),
  positions: [],
  vatRate: 0,
  introText: "",
  footerText: "",
  status,
});

export const formatInvoiceStatus = (status: InvoiceStatus, isOverdue = false): string => {
  const invoice = buildInvoiceForPhase(status, isOverdue);
  const phase = getInvoicePhase(invoice, new Date());
  return formatInvoicePhaseLabel(phase);
};

export const formatOfferStatus = (status: OfferStatus): string => {
  const offer = buildOfferForPhase(status);
  const phase = getOfferPhase(offer);
  return formatOfferPhaseLabel(phase);
};

export const formatDocumentStatus = (
  type: "invoice" | "offer",
  status: InvoiceStatus | OfferStatus,
  options?: { isOverdue?: boolean }
): string => {
  if (type === "invoice") {
    return formatInvoiceStatus(status as InvoiceStatus, options?.isOverdue);
  }
  return formatOfferStatus(status as OfferStatus);
};
