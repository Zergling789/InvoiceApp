import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import { ApiRequestError } from "@/utils/errors";

export async function sendBetaFeedback(input: { category: "BUG" | "UNDERSTANDING" | "FEATURE_REQUEST"; message: string; route: string; requestId?: string }) {
  const response = await apiFetch("/api/beta/feedback", { method: "POST", body: JSON.stringify(input) }, { auth: true });
  if (!response.ok) { const error = await readApiError(response); throw new ApiRequestError(error.message || "Feedback konnte nicht gesendet werden.", response.status, error.code); }
}
