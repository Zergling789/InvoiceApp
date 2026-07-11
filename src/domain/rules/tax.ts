import type { Position, TaxCategory } from "@/types";
import { roundMoney } from "./money";

export type TaxGroup = { taxCategory: TaxCategory; taxRate: number; netAmount: number; taxAmount: number; grossAmount: number; taxExemptionReason?: string | null };
export type DocumentTotals = { netTotal: number; taxTotal: number; grossTotal: number; taxGroups: TaxGroup[] };

export function defaultTaxCategory(rate: number, smallBusiness = false): TaxCategory {
  if (smallBusiness) return "SMALL_BUSINESS";
  if (rate === 7) return "REDUCED";
  if (rate === 0) return "ZERO";
  return "STANDARD";
}

export function normalizePositionTax(position: Position, fallbackRate = 0, smallBusiness = false): Position {
  const taxCategory = position.taxCategory ?? defaultTaxCategory(fallbackRate, smallBusiness);
  const taxRate = ["ZERO", "EXEMPT", "REVERSE_CHARGE", "SMALL_BUSINESS"].includes(taxCategory) ? 0 : Number(position.taxRate ?? fallbackRate);
  return { ...position, taxCategory, taxRate };
}

export function getTaxLabel(position: Pick<Position, "taxCategory" | "taxRate">, fallbackRate = 0, smallBusiness = false): string {
  const normalized = normalizePositionTax(position as Position, fallbackRate, smallBusiness);
  if (normalized.taxCategory === "EXEMPT") return "Steuerfrei";
  if (normalized.taxCategory === "REVERSE_CHARGE") return "Reverse Charge";
  if (normalized.taxCategory === "SMALL_BUSINESS") return "Kleinunternehmer";
  return `${normalized.taxRate} %`;
}

export function calculateDocumentTotals(positions: Position[], fallbackRate = 0, smallBusiness = false): DocumentTotals {
  const groups = new Map<string, TaxGroup>();
  for (const raw of positions ?? []) {
    const position = normalizePositionTax(raw, fallbackRate, smallBusiness);
    const lineNet = roundMoney(Number(position.quantity ?? 0) * Number(position.price ?? 0));
    const key = `${position.taxCategory}:${position.taxRate}:${position.taxExemptionReason ?? ""}`;
    const current = groups.get(key);
    groups.set(key, { taxCategory: position.taxCategory!, taxRate: position.taxRate!, netAmount: roundMoney((current?.netAmount ?? 0) + lineNet), taxAmount: 0, grossAmount: 0, taxExemptionReason: position.taxExemptionReason ?? null });
  }
  const taxGroups = [...groups.values()].map((group) => {
    const taxable = !["ZERO", "EXEMPT", "REVERSE_CHARGE", "SMALL_BUSINESS"].includes(group.taxCategory);
    const taxAmount = taxable ? roundMoney(group.netAmount * group.taxRate / 100) : 0;
    return { ...group, taxAmount, grossAmount: roundMoney(group.netAmount + taxAmount) };
  });
  const netTotal = roundMoney(taxGroups.reduce((sum, group) => sum + group.netAmount, 0));
  const taxTotal = roundMoney(taxGroups.reduce((sum, group) => sum + group.taxAmount, 0));
  return { netTotal, taxTotal, grossTotal: roundMoney(netTotal + taxTotal), taxGroups };
}
