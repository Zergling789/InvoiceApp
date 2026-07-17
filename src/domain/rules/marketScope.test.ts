import { describe, expect, it } from "vitest";

import { isSupportedCurrency, normalizeDocumentCountry, SUPPORTED_MARKET_SCOPE } from "./marketScope";

describe("unterstützter Marktumfang", () => {
  it("unterstützt ausschließlich EUR für neue Dokumente", () => {
    expect(SUPPORTED_MARKET_SCOPE.currency).toBe("EUR");
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("USD")).toBe(false);
    expect(isSupportedCurrency("CHF")).toBe(false);
    expect(isSupportedCurrency("GBP")).toBe(false);
  });
  it("preserves foreign customer countries instead of silently using Germany", () => {
    expect(normalizeDocumentCountry(undefined)).toBe("DE");
    expect(normalizeDocumentCountry("Deutschland")).toBe("DE");
    expect(normalizeDocumentCountry("de")).toBe("DE");
    expect(normalizeDocumentCountry("Österreich")).toBe("ÖSTERREICH");
    expect(normalizeDocumentCountry("AT")).toBe("AT");
  });
});
