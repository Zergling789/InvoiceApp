import { readApiError } from "@/app/api/apiError";
import { apiFetch, readJsonResponse } from "@/app/api/apiClient";

export type AiDraftPosition = { description: string; quantity: number; unit: string; price: number };
export type AiDocumentDraft = {
  positions: AiDraftPosition[];
  introText: string;
  footerText: string;
  warnings: string[];
};
export type CreateAiDraftInput = {
  description: string;
  documentType: "invoice" | "offer";
  currency: string;
  vatRate: number;
};

export async function createAiDocumentDraft(input: CreateAiDraftInput): Promise<AiDocumentDraft> {
  const response = await apiFetch("/api/ai/invoice-draft", {
    method: "POST",
    body: JSON.stringify(input),
  }, { auth: true });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message ?? "KI-Vorschlag konnte nicht erstellt werden.");
  }
  const data = await readJsonResponse<{ draft: AiDocumentDraft }>(response);
  return data.draft;
}
