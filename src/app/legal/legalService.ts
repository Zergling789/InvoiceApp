import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import { ApiRequestError } from "@/utils/errors";

export type LegalAcceptanceStatus = {
  current: boolean;
  requiredVersions: { TERMS: string; PRIVACY: string };
};

async function parse(response: Response): Promise<LegalAcceptanceStatus> {
  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(error.message || "Zustimmungsstatus konnte nicht verarbeitet werden.", response.status, error.code);
  }
  return response.json() as Promise<LegalAcceptanceStatus>;
}

export async function getLegalAcceptanceStatus() {
  return parse(await apiFetch("/api/legal/acceptances", undefined, { auth: true }));
}

export async function acceptCurrentLegalDocuments() {
  return parse(await apiFetch("/api/legal/acceptances", {
    method: "POST",
    body: JSON.stringify({ acceptTerms: true, acceptPrivacy: true }),
  }, { auth: true }));
}
