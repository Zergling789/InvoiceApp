import { apiFetch, readJsonResponse } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import type { TaxCategory } from "@/types";

export type PositionSuggestion = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  lastPrice: number | null;
  standardPrice: number | null;
  taxCategory: TaxCategory | null;
  taxRate: number | null;
  category: string;
  source: string;
  kind: "PRODUCT" | "SERVICE" | "TEMPLATE" | "HISTORY";
  productNumber?: string | null;
  manufacturer?: string | null;
  imageUrl?: string | null;
};

export async function findPositionSuggestions(query: string, customerId?: string): Promise<PositionSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  if (customerId) params.set("customerId", customerId);
  const response = await apiFetch(`/api/positions/suggestions?${params}`, {}, { auth: true });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message ?? "Positionsvorschläge konnten nicht geladen werden.");
  }
  return (await readJsonResponse<{ suggestions: PositionSuggestion[] }>(response)).suggestions;
}

export async function recordPositionSuggestionEvent(input: {
  customerId?: string;
  documentType: "invoice" | "offer";
  query: string;
  suggestionType: PositionSuggestion["kind"] | "AI" | "GROUP";
  suggestionId?: string;
  action: "SHOWN" | "SELECTED" | "DISCARDED" | "APPLIED" | "EDITED" | "PRICE_CHANGED";
  originalValue?: unknown;
  finalValue?: unknown;
}): Promise<void> {
  await apiFetch("/api/positions/suggestion-events", { method: "POST", body: JSON.stringify(input) }, { auth: true });
}
