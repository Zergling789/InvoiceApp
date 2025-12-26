import type { UserSettings } from "@/types";
import { dbNextNumber } from "@/db/documentsDb";

export function formatDocumentNumber(
  type: "offer" | "invoice",
  counter: number,
  settings?: Pick<UserSettings, "prefixInvoice" | "prefixOffer" | "numberPadding">
): string {
  const padding = Math.max(1, settings?.numberPadding ?? 4);
  const prefix = type === "invoice" ? settings?.prefixInvoice ?? "RE" : settings?.prefixOffer ?? "ANG";
  const padded = String(counter).padStart(padding, "0");

  if (!prefix?.trim()) return padded;
  return `${prefix}-${padded}`;
}

export const getNextDocumentNumber = async (
  type: "offer" | "invoice",
  settings?: Pick<UserSettings, "prefixInvoice" | "prefixOffer" | "numberPadding">
): Promise<string> => {
  const next = await dbNextNumber(type);
  return formatDocumentNumber(type, next, settings);
};
