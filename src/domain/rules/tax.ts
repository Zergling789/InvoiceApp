import type { Position, TaxCategory } from "@/types";
import { roundMoney } from "./money";

export type TaxGroup = { taxCategory: TaxCategory; taxRate: number; netAmount: number; taxAmount: number; grossAmount: number; taxExemptionReason?: string | null };
export type DocumentTotals = { netTotal: number; taxTotal: number; grossTotal: number; taxGroups: TaxGroup[] };

export const SUPPORTED_TAX_RATES = {
  STANDARD: 19,
  REDUCED: 7,
  SMALL_BUSINESS: 0,
} as const satisfies Partial<Record<TaxCategory, number>>;

export const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  STANDARD: "Regelsteuer (19 %)",
  REDUCED: "Ermäßigte Steuer (7 %)",
  SMALL_BUSINESS: "Kleinunternehmer (0 %)",
  ZERO: "0 % steuerpflichtig",
  EXEMPT: "Steuerbefreit",
  REVERSE_CHARGE: "Reverse Charge",
};

export function isSupportedPositionTax(
  position: { taxCategory?: TaxCategory | null; taxRate?: number | null },
  smallBusiness = false,
): boolean {
  if (smallBusiness) {
    return position.taxCategory === "SMALL_BUSINESS" && Number(position.taxRate ?? 0) === 0;
  }
  return (
    (position.taxCategory === "STANDARD" && Number(position.taxRate) === SUPPORTED_TAX_RATES.STANDARD) ||
    (position.taxCategory === "REDUCED" && Number(position.taxRate) === SUPPORTED_TAX_RATES.REDUCED)
  );
}

export function resolveSupportedPositionTax(
  position: { taxCategory?: TaxCategory | null; taxRate?: number | null },
  fallbackRate = 19,
  smallBusiness = false,
): { taxCategory: "STANDARD" | "REDUCED" | "SMALL_BUSINESS"; taxRate: 19 | 7 | 0 } {
  if (isSupportedPositionTax(position, smallBusiness)) {
    return {
      taxCategory: position.taxCategory as "STANDARD" | "REDUCED" | "SMALL_BUSINESS",
      taxRate: Number(position.taxRate) as 19 | 7 | 0,
    };
  }
  if (smallBusiness) return { taxCategory: "SMALL_BUSINESS", taxRate: 0 };
  if (Number(fallbackRate) === 7) return { taxCategory: "REDUCED", taxRate: 7 };
  return { taxCategory: "STANDARD", taxRate: 19 };
}

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
