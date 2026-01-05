import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";

export type SendDocumentEmailResult =
  | {
      ok: true;
      warningCode?: string;
      requestId?: string;
    }
  | {
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

const createIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export async function sendDocumentEmail(payload: SendDocumentEmailPayload): Promise<SendDocumentEmailResult> {
  let attempt = 0;
  let lastError: unknown = null;
  const idempotencyKey = createIdempotencyKey();

  while (attempt < 2) {
    attempt += 1;
    const res = await apiFetch(
      "/api/email",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
      { auth: true }
    );

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { warning_code?: string; requestId?: string }
        | null;
      return {
        ok: true,
        warningCode: data?.warning_code,
        requestId: data?.requestId,
      };
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
