import { readApiError } from "@/app/api/apiError";
import { apiFetch } from "@/app/api/apiClient";

type PdfPayload = {
  type: "offer" | "invoice";
  docId: string;
};

const filenameFromHeader = (header: string | null) => {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? null;
};

export async function fetchDocumentPdf(payload: PdfPayload): Promise<{ blob: Blob; filename: string }> {
  const res = await apiFetch("/api/pdf", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { auth: true });

  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "PDF konnte nicht erstellt werden.");
  }

  const blob = await res.blob();
  const filename =
    filenameFromHeader(res.headers.get("content-disposition")) || `${payload.type}-${payload.docId}.pdf`;
  return { blob, filename };
}

export async function downloadDocumentPdf(payload: PdfPayload) {
  const res = await apiFetch("/api/pdf/link", {
    method: "POST",
    body: JSON.stringify(payload),
  }, { auth: true });

  if (!res.ok) {
    const err = await readApiError(res);
    throw new Error(err.message || "PDF konnte nicht erstellt werden.");
  }

  const data = await res.json();
  if (!data?.url) {
    throw new Error("PDF konnte nicht erstellt werden.");
  }

  window.location.href = data.url;
}
