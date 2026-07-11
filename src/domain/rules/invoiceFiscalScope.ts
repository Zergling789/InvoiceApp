import type { Invoice, UserSettings } from "@/types";
export type InvoiceFiscalErrorCode = "SERVICE_DATE_REQUIRED" | "SERVICE_PERIOD_INVALID" | "UNSUPPORTED_MARKET_SCOPE" | "UNSUPPORTED_TAX_CASE" | "SELLER_TAX_IDENTIFICATION_REQUIRED";
export function validateInvoiceFiscalScope(invoice: Invoice, settings: UserSettings): InvoiceFiscalErrorCode | null {
  const hasDate=Boolean(invoice.serviceDate), hasStart=Boolean(invoice.servicePeriodStart), hasEnd=Boolean(invoice.servicePeriodEnd);
  if ((hasDate && (hasStart || hasEnd)) || (!hasDate && (!hasStart || !hasEnd))) return "SERVICE_DATE_REQUIRED";
  if (hasStart && hasEnd && invoice.servicePeriodEnd! < invoice.servicePeriodStart!) return "SERVICE_PERIOD_INVALID";
  if ((invoice.sellerCountry??"DE")!=="DE" || (invoice.customerCountry??"DE")!=="DE" || (invoice.serviceCountry??"DE")!=="DE" || (invoice.customerType??"BUSINESS")!=="BUSINESS" || (invoice.currency??"EUR")!=="EUR") return "UNSUPPORTED_MARKET_SCOPE";
  if (!settings.sellerTaxNumber?.trim() && !settings.sellerVatId?.trim() && !settings.taxId?.trim()) return "SELLER_TAX_IDENTIFICATION_REQUIRED";
  return invoice.positions.every(p => (p.taxCategory==="STANDARD"&&p.taxRate===19&&!invoice.isSmallBusiness)||(p.taxCategory==="REDUCED"&&p.taxRate===7&&!invoice.isSmallBusiness)||(p.taxCategory==="SMALL_BUSINESS"&&Number(p.taxRate??0)===0&&invoice.isSmallBusiness)) ? null : "UNSUPPORTED_TAX_CASE";
}
