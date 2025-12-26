import { requireAccessToken } from "@/lib/auth";

type PdfPayload = {
  type: "offer" | "invoice";
  doc: any;
  settings: any;
  client: any;
};

const sanitizeFilename = (value: string) =>
  (value || "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

const buildFilename = (payload: PdfPayload) => {
  const prefix = payload.type === "invoice" ? "RE" : "ANG";
  const clientName = payload.client?.companyName ?? payload.client?.name ?? "";
  const datePart = payload.doc?.date ?? "";
  const num = payload.doc?.number ?? "0001";
  const raw = `${prefix}-${num}_${clientName}_${datePart}.pdf`;
  return sanitizeFilename(raw) || `${prefix}-${num}.pdf`;
};

export async function fetchDocumentPdf(payload: PdfPayload): Promise<{ blob: Blob; filename: string }> {
  const token = await requireAccessToken();
  const res = await fetch("/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "PDF konnte nicht erstellt werden.");
  }

  const blob = await res.blob();
  return { blob, filename: buildFilename(payload) };
}

export async function downloadDocumentPdf(payload: PdfPayload) {
  const { blob, filename } = await fetchDocumentPdf(payload);
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}
