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

export const isIosLikeDevice = () => {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform ?? "";
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const userAgent = navigator.userAgent ?? "";
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
};

export async function getPdfBlob(payload: PdfPayload): Promise<{ blob: Blob; filename: string }> {
  const res = await apiFetch(
    "/api/pdf",
    {
      method: "POST",
      body: JSON.stringify(payload),
      credentials: "include",
    },
    { auth: true }
  );

  if (!res.ok) {
    const responseText = await res.clone().text().catch(() => "");
    const preview = responseText.trim().slice(0, 200);
    console.error("PDF download failed", { status: res.status, body: preview });
    const err = await readApiError(res);
    throw new Error(err.message || "PDF konnte nicht erstellt werden.");
  }

  const blob = await res.blob();
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/pdf") && blob.size === 0) {
    throw new Error("PDF konnte nicht erstellt werden.");
  }
  const filename =
    filenameFromHeader(res.headers.get("content-disposition")) || `${payload.type}-${payload.docId}.pdf`;
  return { blob, filename };
}

export function openPdfInViewerIOS(popup: Window | null, objectUrl: string): void {
  if (!popup) return;
  popup.location.href = objectUrl;
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 20000);
}

export function triggerDownloadNonIOS(objectUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
