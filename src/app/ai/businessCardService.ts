import { apiFetch, readJsonResponse } from "@/app/api/apiClient";
import { readApiError } from "@/app/api/apiError";

export type BusinessCardContact = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  jobTitle: string;
  notes: string;
  warnings: string[];
};

export async function scanBusinessCard(imageDataUrl: string) {
  const response = await apiFetch("/api/ai/business-card", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl }),
  }, { auth: true });
  if (!response.ok) {
    const error = await readApiError(response);
    throw new Error(error.message ?? "Visitenkarte konnte nicht analysiert werden.");
  }
  return (await readJsonResponse<{ contact: BusinessCardContact }>(response)).contact;
}

export async function prepareBusinessCardImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Bitte JPEG, PNG oder WebP verwenden.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Das Originalbild darf maximal 8 MB groß sein.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    bitmap.close();
  }
}
