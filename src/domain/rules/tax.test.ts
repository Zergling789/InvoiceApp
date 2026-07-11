import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, getTaxLabel, normalizePositionTax } from "./tax";
import type { Position, TaxCategory } from "@/types";

const p = (price: number, taxCategory: TaxCategory, taxRate: number, reason?: string): Position => ({ id: `${taxCategory}-${price}`, description: "Leistung", quantity: 1, unit: "Std", price, taxCategory, taxRate, taxExemptionReason: reason });

describe("positionsbasierte Umsatzsteuer", () => {
  it("berechnet das fachliche Mischsteuer-Beispiel mit Gruppenrundung", () => {
    const totals = calculateDocumentTotals([p(60, "STANDARD", 19), p(150, "REDUCED", 7), p(10, "EXEMPT", 0, "§ 4 UStG"), p(45.99, "ZERO", 0)], 19);
    expect(totals).toMatchObject({ netTotal: 265.99, taxTotal: 21.9, grossTotal: 287.89 });
    expect(totals.taxGroups.map((group) => group.taxCategory)).toEqual(["STANDARD", "REDUCED", "EXEMPT", "ZERO"]);
  });

  it.each([["EXEMPT", "Steuerfrei"], ["REVERSE_CHARGE", "Reverse Charge"], ["SMALL_BUSINESS", "Kleinunternehmer"], ["ZERO", "0 %"]] as const)("labelt %s eindeutig", (category, label) => {
    expect(getTaxLabel(p(10, category, 0))).toBe(label);
  });

  it("normalisiert Legacy-Positionen mit dem Dokumentsteuersatz", () => {
    const legacy = { id: "1", description: "Alt", quantity: 1, unit: "Std", price: 10 } as Position;
    expect(normalizePositionTax(legacy, 7)).toMatchObject({ taxCategory: "REDUCED", taxRate: 7 });
  });

  it("berechnet Reverse Charge und Kleinunternehmer ohne Steuerbetrag", () => {
    expect(calculateDocumentTotals([p(100, "REVERSE_CHARGE", 0)]).taxTotal).toBe(0);
    expect(calculateDocumentTotals([p(100, "SMALL_BUSINESS", 0)], 19, true).taxTotal).toBe(0);
  });
});
