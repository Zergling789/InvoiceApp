import type { Offer, UserSettings } from "../types";
import { OfferStatus } from "../types";

export function isOfferOpen(status: OfferStatus): boolean {
  return status === OfferStatus.DRAFT || status === OfferStatus.SENT;
}

export function canConvertToInvoice(offer: Offer): boolean {
  return !offer.invoiceId && offer.status !== OfferStatus.REJECTED;
}

export function defaultOfferTexts(settings: UserSettings): {
  introText: string;
  footerText: string;
} {
  const fallbackTerms = Number(settings.defaultPaymentTerms ?? 14);
  return {
    introText: "Gerne unterbreite ich Ihnen folgendes Angebot:",
    footerText: `Dieses Angebot ist ${fallbackTerms} Tage gültig.`,
  };
}
