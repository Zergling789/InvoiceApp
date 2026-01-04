import { Invoice, InvoiceStatus, Offer, OfferStatus, Position } from "@/types";
import { formatMoney } from "@/utils/money";

const DAY_MS = 86400000;

export type OfferWithFollowUp = Offer & {
  followUpAt?: string | null;
  lastInteractionAt?: string | null;
};

export const formatCurrencyEur = (amount: number) => formatMoney(amount, "EUR", "de-DE");

export const calculatePositionsTotal = (positions: Position[]) =>
  positions.reduce((total, position) => total + position.quantity * position.price, 0);

export const calculateDocumentTotal = (
  positions: Position[],
  vatRate: number,
  isSmallBusiness = false
) => {
  const net = calculatePositionsTotal(positions);
  return isSmallBusiness ? net : net * (1 + (vatRate || 0) / 100);
};

export const getDaysSince = (dateStr?: string | null, today = new Date()) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = today.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / DAY_MS));
};

export const isInvoicePaid = (invoice: Invoice) => invoice.status === InvoiceStatus.PAID;
export const isInvoiceCanceled = (invoice: Invoice) => invoice.status === InvoiceStatus.CANCELED;

export const isInvoiceOverdue = (invoice: Invoice, today = new Date()) => {
  if (typeof invoice.isOverdue === "boolean") return invoice.isOverdue;
  if (isInvoicePaid(invoice) || isInvoiceCanceled(invoice)) return false;
  if (![InvoiceStatus.ISSUED, InvoiceStatus.SENT].includes(invoice.status)) return false;
  if (invoice.paidAt || invoice.canceledAt) return false;
  if (!invoice.dueDate) return false;
  return new Date(invoice.dueDate).getTime() < today.getTime();
};

export const isInvoiceOpen = (invoice: Invoice) => !isInvoicePaid(invoice) && !isInvoiceCanceled(invoice);

export const isOfferOpen = (offer: Offer) =>
  offer.status !== OfferStatus.ACCEPTED &&
  offer.status !== OfferStatus.REJECTED &&
  offer.status !== OfferStatus.INVOICED;

export const getOfferReferenceDate = (offer: OfferWithFollowUp) =>
  offer.lastInteractionAt || offer.lastSentAt || offer.sentAt || offer.date;

export const getInvoiceReferenceDate = (invoice: Invoice) => invoice.sentAt || invoice.date;

export const isOfferFollowUpDue = (offer: OfferWithFollowUp, today = new Date()) => {
  if (!isOfferOpen(offer)) return false;
  if (offer.status !== OfferStatus.SENT) return false;

  if (offer.followUpAt) {
    return new Date(offer.followUpAt).getTime() <= today.getTime();
  }

  const reference = offer.lastSentAt || offer.sentAt || offer.date;
  return getDaysSince(reference, today) >= 7;
};

export const sortByDateAsc = (a?: string | null, b?: string | null) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return new Date(a).getTime() - new Date(b).getTime();
};

export const bucketOfferAge = (ageDays: number) => {
  if (ageDays <= 3) return "Neu";
  if (ageDays <= 10) return "Warm";
  return "Kritisch";
};
