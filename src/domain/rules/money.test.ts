import { describe, expect, it } from "vitest";

import { calcPositionVat } from "./money";
import type { Position } from "@/types";

const position = (net: number, taxCategory: Position["taxCategory"], taxRate: number): Position => ({
  id: crypto.randomUUID(), description: "Leistung", quantity: 1, unit: "Stk", price: net, taxCategory, taxRate,
});

describe("calcPositionVat", () => {
  it("berechnet gemischte Steuersätze je Position", () => {
    expect(calcPositionVat([position(100, "STANDARD", 19), position(100, "REDUCED", 7), position(100, "ZERO", 0)])).toBe(26);
  });

  it("trennt Kleinunternehmer und Steuerbefreiung vom globalen Fallback", () => {
    expect(calcPositionVat([position(100, "SMALL_BUSINESS", 0), position(100, "EXEMPT", 0)], 19)).toBe(0);
  });
});
