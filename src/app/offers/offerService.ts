import type { Offer } from "@/types";
import * as repo from "@/data/repositories/offersRepo";

export const listOffers = (): Promise<Offer[]> => repo.listOffers();
export const getOffer = (id: string) => repo.getOffer(id);
export const saveOffer = (offer: Offer) => repo.saveOffer(offer);
export const deleteOffer = (id: string) => repo.deleteOffer(id);
export const removeOffer = deleteOffer;
