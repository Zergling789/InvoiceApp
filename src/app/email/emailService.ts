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

export async function sendDocumentEmail(payload: SendDocumentEmailPayload): Promise<SendDocumentEmailResult> {
  const res = await apiFetch("/api/email", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { auth: true });

  if (res.ok) {
    return { ok: true };
  }

  const { code, message } = await readApiError(res);

  if (code === "EMAIL_NOT_CONFIGURED") {
    return { ok: false, code, message };
  }

  const error = new Error(message || "E-Mail konnte nicht gesendet werden.");
  if (code) {
    (error as any).code = code;
  }
  throw error;
}
