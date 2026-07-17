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

type EmailApiFetch = (
  input: RequestInfo,
  init?: RequestInit,
  opts?: { auth?: boolean },
) => Promise<Response>;

type SendDocumentEmailOptions = {
  timeoutMs?: number;
  apiFetchImpl?: EmailApiFetch;
  delayImpl?: (ms: number) => Promise<unknown>;
};

const EMAIL_REQUEST_TIMEOUT_MS = 60_000;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createEmailError = (message: string, code?: string, requestId?: string) => {
  const error = new Error(message) as Error & { code?: string; requestId?: string };
  if (code) error.code = code;
  if (requestId) error.requestId = requestId;
  return error;
};

const createUnknownDeliveryError = () =>
  createEmailError(
    "Der Versandstatus ist unklar. Bitte nicht sofort erneut senden und den Dokumentstatus prüfen.",
    "EMAIL_SEND_STATUS_UNKNOWN",
  );

export const shouldRetryEmailSend = (_status: number, code?: string) =>
  code === "PDF_ENGINE_RESET";

export async function sendDocumentEmail(
  payload: SendDocumentEmailPayload,
  options: SendDocumentEmailOptions = {},
): Promise<SendDocumentEmailResult> {
  const apiFetchImpl = options.apiFetchImpl ?? apiFetch;
  const delayImpl = options.delayImpl ?? delay;
  const timeoutMs = options.timeoutMs ?? EMAIL_REQUEST_TIMEOUT_MS;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < 2) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await apiFetchImpl(
        "/api/email",
        {
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
        { auth: true },
      );
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === "AbortError";
      if (controller.signal.aborted || isAbortError || error instanceof TypeError) {
        throw createUnknownDeliveryError();
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }

    if (res.ok) {
      return { ok: true };
    }

    const { code, message, requestId } = await readApiError(res);

    if (code === "EMAIL_NOT_CONFIGURED") {
      return { ok: false, code, message };
    }

    if (shouldRetryEmailSend(res.status, code) && attempt === 1) {
      await delayImpl(500);
      continue;
    }

    const error = createEmailError(
      message || "E-Mail konnte nicht gesendet werden.",
      code,
      requestId,
    );
    lastError = error;
    break;
  }

  throw lastError ?? new Error("E-Mail konnte nicht gesendet werden.");
}
