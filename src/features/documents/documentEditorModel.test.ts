import { describe, expect, it } from "vitest";
import { applyDefaultTaxToPositions } from "./documentEditorModel";
import type { Position } from "@/types";

const aiPosition = { id: "ai", description: "KI-Leistung", quantity: 1, unit: "Std", price: 100, taxCategory: "EXEMPT", taxRate: 0 } as Position;

describe("KI-Positionsübernahme", () => {
  it("ignoriert Steuerwerte der KI und setzt die Editor-Standardsteuer", () => {
    expect(applyDefaultTaxToPositions([aiPosition], 19, false)[0]).toMatchObject({ taxCategory: "STANDARD", taxRate: 19 });
  });

  it("setzt für Kleinunternehmer ausschließlich SMALL_BUSINESS", () => {
    expect(applyDefaultTaxToPositions([aiPosition], 19, true)[0]).toMatchObject({ taxCategory: "SMALL_BUSINESS", taxRate: 0 });
  });
});
