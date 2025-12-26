import type { Offer } from "@/domain/types";
import { normalizeOffer } from "@/domain/models/Offer";
import { dbDeleteOffer, dbGetOffer, dbListOffers, dbUpsertOffer } from "@/db/offersDb";

export async function listOffers(): Promise<Offer[]> {
  const offers = await dbListOffers();
  return offers.map(normalizeOffer);
}

export async function getOffer(id: string): Promise<Offer | null> {
  const offer = await dbGetOffer(id);
  return offer ? normalizeOffer(offer) : null;
}

export async function saveOffer(offer: Offer): Promise<void> {
  await dbUpsertOffer(normalizeOffer(offer));
}

export async function deleteOffer(id: string): Promise<void> {
  await dbDeleteOffer(id);
}
