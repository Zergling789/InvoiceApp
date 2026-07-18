import type { Offer } from "@/types";
import * as repo from "@/data/repositories/offersRepo";
import { supabase } from "@/supabaseClient";
import type { CursorPageOptions } from "@/db/cursorPagination";

export type OfferDecision = "ACCEPTED" | "REJECTED";

const OFFER_WORKFLOW_ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "INVALID_INPUT",
  "OFFER_NOT_FOUND",
  "OFFER_NOT_RESPONDABLE",
  "OFFER_NOT_ACCEPTED",
  "OFFER_ALREADY_CONVERTED",
] as const;

export const resolveOfferWorkflowErrorCode = (error: { code?: string; message?: string }) =>
  OFFER_WORKFLOW_ERROR_CODES.find((code) => error.message?.includes(code)) ?? error.code;

const createOfferWorkflowError = (error: { code?: string; message?: string }) => {
  const wrapped = new Error(error.message ?? "Angebotsaktion konnte nicht ausgeführt werden.");
  (wrapped as Error & { code?: string }).code = resolveOfferWorkflowErrorCode(error);
  return wrapped;
};

export const listOffers = (): Promise<Offer[]> => repo.listOffers();
export const listOffersPage = (options: CursorPageOptions = {}) => repo.listOffersPage(options);
export const getOffer = (id: string) => repo.getOffer(id);
export const saveOffer = (offer: Offer) => repo.saveOffer(offer);
export const deleteOffer = (id: string) => repo.deleteOffer(id);
export const removeOffer = deleteOffer;

export const recordOfferDecision = async (
  offerId: string,
  decision: OfferDecision,
): Promise<Offer> => {
  const { error } = await supabase.rpc("record_offer_decision", {
    offer_id: offerId,
    decision,
  });
  if (error) throw createOfferWorkflowError(error);

  const updated = await getOffer(offerId);
  if (!updated) {
    throw createOfferWorkflowError({ code: "OFFER_NOT_FOUND" });
  }
  return updated;
};

export const convertOfferToInvoice = async (offerId: string): Promise<string> => {
  const { data, error } = await supabase.rpc("convert_offer_to_invoice", {
    offer_id: offerId,
  });
  if (error) throw createOfferWorkflowError(error);
  if (!data?.id) {
    throw createOfferWorkflowError({ code: "OFFER_NOT_FOUND" });
  }
  return data.id;
};
