import { InvoiceStatus, OfferStatus } from "@/types";

export const formatInvoiceStatus = (status: InvoiceStatus, isOverdue = false): string => {
  if (status === InvoiceStatus.PAID) return "Bezahlt";
  if (status === InvoiceStatus.DRAFT) return "Entwurf";
  if (isOverdue || status === InvoiceStatus.OVERDUE) return "Überfällig";
  if (status === InvoiceStatus.SENT) return "Gesendet";
  return "Offen";
};

export const formatOfferStatus = (status: OfferStatus): string => {
  switch (status) {
    case OfferStatus.DRAFT:
      return "Entwurf";
    case OfferStatus.SENT:
      return "Gesendet";
    case OfferStatus.ACCEPTED:
      return "Angenommen";
    case OfferStatus.REJECTED:
      return "Abgelehnt";
    case OfferStatus.INVOICED:
      return "In Rechnung gestellt";
    default:
      return String(status);
  }
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
