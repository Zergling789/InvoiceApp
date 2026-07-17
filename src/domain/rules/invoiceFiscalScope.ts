import type { Invoice, UserSettings } from "@/types";
import { isSupportedPositionTax } from "@/domain/rules/tax";
import { SUPPORTED_MARKET_SCOPE } from "@/domain/rules/marketScope";
export type InvoiceFiscalErrorCode = "SERVICE_DATE_REQUIRED" | "SERVICE_PERIOD_INVALID" | "UNSUPPORTED_MARKET_SCOPE" | "UNSUPPORTED_TAX_CASE" | "SELLER_TAX_IDENTIFICATION_REQUIRED";
export function validateInvoiceFiscalScope(invoice: Invoice, settings: UserSettings): InvoiceFiscalErrorCode | null {
  const hasDate=Boolean(invoice.serviceDate), hasStart=Boolean(invoice.servicePeriodStart), hasEnd=Boolean(invoice.servicePeriodEnd);
  if ((hasDate && (hasStart || hasEnd)) || (!hasDate && (!hasStart || !hasEnd))) return "SERVICE_DATE_REQUIRED";
  if (hasStart && hasEnd && invoice.servicePeriodEnd! < invoice.servicePeriodStart!) return "SERVICE_PERIOD_INVALID";
  if ((invoice.sellerCountry??SUPPORTED_MARKET_SCOPE.country)!==SUPPORTED_MARKET_SCOPE.country || (invoice.customerCountry??SUPPORTED_MARKET_SCOPE.country)!==SUPPORTED_MARKET_SCOPE.country || (invoice.serviceCountry??SUPPORTED_MARKET_SCOPE.country)!==SUPPORTED_MARKET_SCOPE.country || (invoice.customerType??SUPPORTED_MARKET_SCOPE.customerType)!==SUPPORTED_MARKET_SCOPE.customerType || (invoice.currency??SUPPORTED_MARKET_SCOPE.currency)!==SUPPORTED_MARKET_SCOPE.currency) return "UNSUPPORTED_MARKET_SCOPE";
  if (!settings.sellerTaxNumber?.trim() && !settings.sellerVatId?.trim() && !settings.taxId?.trim()) return "SELLER_TAX_IDENTIFICATION_REQUIRED";
  return invoice.positions.every((position) => isSupportedPositionTax(position, invoice.isSmallBusiness))
    ? null
    : "UNSUPPORTED_TAX_CASE";
}
