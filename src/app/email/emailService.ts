import { apiFetch } from "@/app/api/apiClient";

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

  const raw = await res.text().catch(() => "");
  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (res.ok && data?.ok) {
    return { ok: true };
  }

  const code = data?.error?.code ?? "EMAIL_SEND_FAILED";
  const message = data?.error?.message;

  if (code === "EMAIL_NOT_CONFIGURED") {
    return { ok: false, code, message };
  }

  if (!res.ok) {
    const fallback = message || raw;
    throw new Error(fallback || "E-Mail konnte nicht gesendet werden.");
  }

  throw new Error(message || "E-Mail konnte nicht gesendet werden.");
}
