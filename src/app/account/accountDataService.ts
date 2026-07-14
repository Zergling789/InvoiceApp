import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import { ApiRequestError } from "@/utils/errors";

const filenameFromHeader = (header: string | null) => /filename="?([^";]+)"?/i.exec(header ?? "")?.[1] ?? "FreelanceFlow_Datenexport.zip";

export async function downloadAccountData() {
  const response = await apiFetch("/api/account/export", { method: "POST" }, { auth: true });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(error.message || "Der Datenexport konnte nicht erstellt werden.", response.status, error.code);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filenameFromHeader(response.headers.get("content-disposition"));
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function requestAccountDeletion(password: string, confirmation: string) {
  const response = await apiFetch("/api/account/deletion-request", {
    method: "POST",
    body: JSON.stringify({ password, confirmation }),
  }, { auth: true });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiRequestError(error.message || "Der Löschauftrag konnte nicht erstellt werden.", response.status, error.code);
  }
  return response.json() as Promise<{ request: { scheduled_for?: string; scheduledFor?: string }; alreadyRequested: boolean }>;
}
