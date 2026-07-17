import type { CustomerType, SupportedCountry } from "@/types";

export const SUPPORTED_MARKET_SCOPE = {
  currency: "EUR",
  country: "DE" as SupportedCountry,
  customerType: "BUSINESS" as CustomerType,
} as const;

export const isSupportedCurrency = (currency: string | null | undefined) =>
  (currency ?? SUPPORTED_MARKET_SCOPE.currency) === SUPPORTED_MARKET_SCOPE.currency;

const GERMANY_LABELS = new Set(["DE", "DEUTSCHLAND", "GERMANY"]);

export const normalizeDocumentCountry = (country: string | null | undefined) => {
  const normalizedCountry = country?.trim().toUpperCase();
  if (!normalizedCountry || GERMANY_LABELS.has(normalizedCountry)) {
    return SUPPORTED_MARKET_SCOPE.country;
  }

  return normalizedCountry;
};
