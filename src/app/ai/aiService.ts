import { readApiError } from "@/app/api/apiError";
import { apiFetch, readJsonResponse } from "@/app/api/apiClient";
import {
  parseAiDocumentDraftResponse,
  type AiDocumentDraft,
  type AiDraftPosition,
  type TextDocumentIntakeSource,
} from "@/app/ai/documentDraftContract";
import { ApiRequestError } from "@/utils/errors";

export type { AiDocumentDraft, AiDraftPosition };
export type CreateAiDraftInput = {
  description: string;
  documentType: "invoice" | "offer";
  currency: string;
  vatRate: number;
  customerId?: string;
};

export const buildDocumentDraftRequest = (input: CreateAiDraftInput) => ({
  source: {
    kind: "TEXT",
    text: input.description,
  } satisfies TextDocumentIntakeSource,
  documentType: input.documentType,
  currency: input.currency,
  vatRate: input.vatRate,
  customerId: input.customerId,
});

export async function createAiDocumentDraft(input: CreateAiDraftInput): Promise<AiDocumentDraft> {
  const response = await apiFetch("/api/ai/document-draft", {
    method: "POST",
    body: JSON.stringify(buildDocumentDraftRequest(input)),
  }, { auth: true });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(
      error.message ?? "KI-Vorschlag konnte nicht erstellt werden.",
      response.status,
      error.code,
      error.requestId,
    );
  }
  const data = await readJsonResponse<unknown>(response);
  const parsed = parseAiDocumentDraftResponse(data);
  if (!parsed) {
    throw new ApiRequestError(
      "Der KI-Vorschlag hatte ein ungültiges Format.",
      502,
      "AI_INVALID_RESPONSE",
    );
  }
  return parsed.draft;
}
