const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function validateCanonicalInvoice(invoice) {
  const issues = [];
  const requireText = (value, code) => { if (!String(value ?? "").trim()) issues.push(code); };
  requireText(invoice.invoiceNumber, "INVOICE_NUMBER_REQUIRED");
  if (!isoDate.test(invoice.issueDate)) issues.push("ISSUE_DATE_INVALID");
  if (invoice.currency !== "EUR") issues.push("CURRENCY_UNSUPPORTED");
  if (invoice.typeCode !== "380") issues.push("INVOICE_TYPE_UNSUPPORTED");
  requireText(invoice.seller.name, "SELLER_NAME_REQUIRED");
  if (!invoice.seller.addressLines.length) issues.push("SELLER_ADDRESS_REQUIRED");
  if (!invoice.seller.street || !invoice.seller.postalCode || !invoice.seller.city) issues.push("SELLER_STRUCTURED_ADDRESS_REQUIRED");
  if (!invoice.seller.electronicAddress || !invoice.seller.electronicAddressScheme) issues.push("SELLER_ELECTRONIC_ADDRESS_REQUIRED");
  if (invoice.seller.country !== "DE") issues.push("SELLER_COUNTRY_UNSUPPORTED");
  if (!invoice.seller.taxNumber && !invoice.seller.vatId) issues.push("SELLER_TAX_ID_REQUIRED");
  requireText(invoice.buyer.name, "BUYER_NAME_REQUIRED");
  if (!invoice.buyer.addressLines.length) issues.push("BUYER_ADDRESS_REQUIRED");
  if (!invoice.buyer.street || !invoice.buyer.postalCode || !invoice.buyer.city) issues.push("BUYER_STRUCTURED_ADDRESS_REQUIRED");
  if (!invoice.buyer.electronicAddress || !invoice.buyer.electronicAddressScheme) issues.push("BUYER_ELECTRONIC_ADDRESS_REQUIRED");
  if (invoice.buyer.country !== "DE" || invoice.buyer.type !== "BUSINESS") issues.push("BUYER_SCOPE_UNSUPPORTED");
  if (invoice.service.country !== "DE") issues.push("SERVICE_COUNTRY_UNSUPPORTED");
  const serviceDateValid = invoice.service.date && isoDate.test(invoice.service.date);
  const periodValid = invoice.service.periodStart && invoice.service.periodEnd && isoDate.test(invoice.service.periodStart) && isoDate.test(invoice.service.periodEnd) && invoice.service.periodEnd >= invoice.service.periodStart;
  if (Boolean(serviceDateValid) === Boolean(periodValid)) issues.push("SERVICE_DATE_INVALID");
  if (invoice.payment.dueDate && !isoDate.test(invoice.payment.dueDate)) issues.push("DUE_DATE_INVALID");
  if (!invoice.lines.length) issues.push("INVOICE_LINES_REQUIRED");
  for (const [index, line] of invoice.lines.entries()) {
    if (!line.name.trim() || !(line.quantity > 0) || line.netUnitPrice < 0) issues.push(`LINE_${index + 1}_INVALID`);
    if (!((line.tax.category === "STANDARD" && line.tax.rate === 19) || (line.tax.category === "REDUCED" && line.tax.rate === 7) || (line.tax.category === "SMALL_BUSINESS" && line.tax.rate === 0))) issues.push(`LINE_${index + 1}_TAX_UNSUPPORTED`);
  }
  const lineTotal = Math.round(invoice.lines.reduce((sum, line) => sum + line.netAmount, 0) * 100) / 100;
  if (lineTotal !== invoice.totals.netTotal || Math.round((invoice.totals.netTotal + invoice.totals.taxTotal) * 100) / 100 !== invoice.totals.grossTotal) issues.push("TOTALS_INCONSISTENT");
  return issues;
}
