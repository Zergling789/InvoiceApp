import type { InvoicePhase, OfferPhase } from "./documentState";

export const formatInvoicePhaseLabel = (phase: InvoicePhase): string => {
  switch (phase) {
    case "draft":
      return "Entwurf";
    case "issued":
      return "Offen";
    case "sent":
      return "Gesendet";
    case "overdue":
      return "Überfällig";
    case "paid":
      return "Bezahlt";
    case "canceled":
      return "Storniert";
  }
};

export const formatOfferPhaseLabel = (phase: OfferPhase): string => {
  switch (phase) {
    case "draft":
      return "Entwurf";
    case "sent":
      return "Gesendet";
    case "accepted":
      return "Angenommen";
    case "rejected":
      return "Abgelehnt";
    case "invoiced":
      return "In Rechnung gestellt";
  }
};
