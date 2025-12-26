import { requireAccessToken } from "@/lib/auth";

type SendDocumentEmailPayload = {
  documentId: string;
  documentType: "offer" | "invoice";
  to: string;
  subject: string;
  message: string;
  pdfBase64: string;
  filename: string;
  senderIdentityId: string;
};

export async function sendDocumentEmail(payload: SendDocumentEmailPayload): Promise<void> {
  const token = await requireAccessToken();
  const res = await fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "E-Mail konnte nicht gesendet werden.");
  }
}
