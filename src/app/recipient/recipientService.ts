import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import { ApiRequestError } from "@/utils/errors";

const parse = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) { const error = await readApiError(response); throw new ApiRequestError(error.message || "Anfrage fehlgeschlagen.", response.status, error.code); }
  return response.json() as Promise<T>;
};

export const createRecipientLink = (type: "offer" | "invoice", id: string) => apiFetch(`/api/documents/${type}/${id}/recipient-link`, { method: "POST" }, { auth: true }).then(parse<{ url: string; expiresAt: string }>);
export const loadRecipientDocument = (token: string) => apiFetch(`/api/public/documents/${encodeURIComponent(token)}`).then(parse<{ type: "offer" | "invoice"; doc: Record<string, unknown>; client: Record<string, unknown>; settings: Record<string, unknown>; response: string | null; responseReason: string | null; expiresAt: string }>);
export const respondToOffer = (token: string, response: "ACCEPTED" | "REJECTED", rejectionReason?: string) => apiFetch(`/api/public/offers/${encodeURIComponent(token)}/respond`, { method: "POST", body: JSON.stringify({ response, rejectionReason }) }).then(parse<{ response: string }>);
