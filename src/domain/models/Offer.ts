import type { Offer } from "../types";
import { OfferStatus } from "../types";

export function createEmptyOffer(id: string, clientId = ""): Offer {
  return {
    id,
    number: "",
    clientId,
    projectId: undefined,
    date: new Date().toISOString().slice(0, 10),
    validUntil: undefined,
    positions: [],
    vatRate: 0,
    introText: "",
    footerText: "",
    status: OfferStatus.DRAFT,
    sentAt: null,
    lastSentAt: null,
    sentCount: 0,
    sentVia: null,
    invoiceId: null,
  };
}

export function normalizeOffer(offer: Offer): Offer {
  return {
    ...offer,
    clientId: offer.clientId ?? "",
    date: offer.date ?? new Date().toISOString().slice(0, 10),
    positions: offer.positions ?? [],
    vatRate: Number(offer.vatRate ?? 0),
    introText: offer.introText ?? "",
    footerText: offer.footerText ?? "",
    status: offer.status ?? OfferStatus.DRAFT,
    sentAt: offer.sentAt ?? null,
    lastSentAt: offer.lastSentAt ?? null,
    sentCount: offer.sentCount ?? 0,
    sentVia: offer.sentVia ?? null,
    invoiceId: offer.invoiceId ?? null,
  };
}
