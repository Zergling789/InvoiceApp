import { readApiError } from "@/app/api/apiError";
import { apiFetch } from "@/app/api/apiClient";
import { ApiRequestError } from "@/utils/errors";

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
    throw new ApiRequestError(err.message || "PDF konnte nicht erstellt werden.", res.status, err.code);
  }

  const blob = await res.blob();
  const filename =
    filenameFromHeader(res.headers.get("content-disposition")) || `${payload.type}-${payload.docId}.pdf`;
  return { blob, filename };
}

export async function downloadDocumentPdf(payload: PdfPayload) {
  const { blob, filename } = await fetchDocumentPdf(payload);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadInvoiceCii(docId: string) {
  const res = await apiFetch("/api/einvoice/cii", { method: "POST", body: JSON.stringify({ docId }) }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new ApiRequestError(err.message || "CII-XML konnte nicht erstellt werden.", res.status, err.code);
  }
  const blob = await res.blob();
  const filename = filenameFromHeader(res.headers.get("content-disposition")) || `rechnung-${docId}.xml`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export async function downloadInvoiceZugferd(docId: string) {
  const res = await apiFetch("/api/einvoice/zugferd", { method: "POST", body: JSON.stringify({ docId }) }, { auth: true });
  if (!res.ok) {
    const err = await readApiError(res);
    throw new ApiRequestError(err.message || "Die E-Rechnung konnte nicht erzeugt werden.", res.status, err.code);
  }
  const blob = await res.blob();
  const filename = filenameFromHeader(res.headers.get("content-disposition")) || `Rechnung_${docId}_ZUGFeRD.pdf`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
