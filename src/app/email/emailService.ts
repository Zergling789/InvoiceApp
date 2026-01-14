import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";

export type SendDocumentEmailResult = {
  ok: true;
} | {
  ok: false;
  code: string;
  message?: string;
};

type SendDocumentEmailPayload = {
  documentId: string;
  documentType: "offer" | "invoice";
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  message: string;
  senderIdentityId: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryEmailSend = (status: number, code?: string) =>
  status === 503 || code === "PDF_ENGINE_RESET";

export async function sendDocumentEmail(payload: SendDocumentEmailPayload): Promise<SendDocumentEmailResult> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < 2) {
    attempt += 1;
    const res = await apiFetch(
      "/api/email",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { auth: true }
    );

    if (res.ok) {
      return { ok: true };
    }

    const { code, message, requestId } = await readApiError(res);

    if (code === "EMAIL_NOT_CONFIGURED") {
      return { ok: false, code, message };
    }

    if (shouldRetryEmailSend(res.status, code) && attempt === 1) {
      await delay(500);
      continue;
    }

    const error = new Error(message || "E-Mail konnte nicht gesendet werden.");
    if (code) {
      (error as Error & { code?: string }).code = code;
    }
    if (requestId) {
      (error as Error & { requestId?: string }).requestId = requestId;
    }
    lastError = error;
    break;
  }

  throw lastError ?? new Error("E-Mail konnte nicht gesendet werden.");
}
