import type { Offer } from "@/domain/types";
import { normalizeOffer } from "@/domain/models/Offer";
import {
  dbDeleteOffer,
  dbGetOffer,
  dbListOffers,
  dbListOffersForProject,
  dbListOffersPage,
  dbUpsertOffer,
} from "@/db/offersDb";
import type { CursorPage, DocumentPageOptions } from "@/db/cursorPagination";

export async function listOffers(): Promise<Offer[]> {
  const offers = await dbListOffers();
  return offers.map(normalizeOffer);
}

export async function listOffersForProject(projectId: string): Promise<Offer[]> {
  return (await dbListOffersForProject(projectId)).map(normalizeOffer);
}

export async function listOffersPage(
  options: DocumentPageOptions = {},
): Promise<CursorPage<Offer>> {
  const page = await dbListOffersPage(options);
  return { ...page, items: page.items.map(normalizeOffer) };
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
