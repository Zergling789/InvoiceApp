import { apiFetch } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";
import {
  beginDocumentDelivery,
  completeDocumentDelivery,
} from "@/app/email/documentDeliveryService";

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
  skipDeliveryLog?: boolean;
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

const safelyCompleteDelivery = async (input: Parameters<typeof completeDocumentDelivery>[0]) => {
  try {
    await completeDocumentDelivery(input);
  } catch (error) {
    console.error("document_delivery_update_failed", error);
  }
};

const safelyBeginDelivery = async (
  payload: SendDocumentEmailPayload,
): Promise<string | null> => {
  try {
    const delivery = await beginDocumentDelivery({
      documentType: payload.documentType,
      documentId: payload.documentId,
      recipient: payload.to,
      cc: payload.cc,
      bcc: payload.bcc,
      subject: payload.subject,
    });
    return delivery.id;
  } catch (error) {
    // The audit trail must never prevent the actual customer communication.
    // A missing migration, temporary Supabase outage or stale client session is
    // therefore logged for diagnostics while the email request continues.
    console.error("document_delivery_begin_failed", error);
    return null;
  }
};

export async function sendDocumentEmail(
  payload: SendDocumentEmailPayload,
  options: SendDocumentEmailOptions = {},
): Promise<SendDocumentEmailResult> {
  const apiFetchImpl = options.apiFetchImpl ?? apiFetch;
  const delayImpl = options.delayImpl ?? delay;
  const timeoutMs = options.timeoutMs ?? EMAIL_REQUEST_TIMEOUT_MS;
  const shouldLogDelivery = !options.skipDeliveryLog && !options.apiFetchImpl;
  let attempt = 0;
  let lastError: unknown = null;
  let deliveryId: string | null = null;

  if (shouldLogDelivery) {
    deliveryId = await safelyBeginDelivery(payload);
  }

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
        if (deliveryId) {
          await safelyCompleteDelivery({
            deliveryId,
            status: "status_unknown",
            errorCode: "EMAIL_SEND_STATUS_UNKNOWN",
            errorMessage: "Die Verbindung wurde während des Versands unterbrochen.",
          });
        }
        throw createUnknownDeliveryError();
      }
      if (deliveryId) {
        await safelyCompleteDelivery({
          deliveryId,
          status: "failed",
          errorCode: "EMAIL_SEND_FAILED",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }

    if (res.ok) {
      if (deliveryId) await safelyCompleteDelivery({ deliveryId, status: "sent" });
      return { ok: true };
    }

    const { code, message, requestId } = await readApiError(res);

    if (code === "EMAIL_NOT_CONFIGURED") {
      if (deliveryId) {
        await safelyCompleteDelivery({
          deliveryId,
          status: "failed",
          errorCode: code,
          errorMessage: message,
        });
      }
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
    if (deliveryId) {
      await safelyCompleteDelivery({
        deliveryId,
        status: "failed",
        errorCode: code,
        errorMessage: message || error.message,
      });
    }
    break;
  }

  throw lastError ?? new Error("E-Mail konnte nicht gesendet werden.");
}
