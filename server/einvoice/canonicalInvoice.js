const money = (value) => Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;

const addressLines = (value) => String(value ?? "").split("\n").map((line) => line.trim()).filter(Boolean);

export function buildCanonicalInvoice({ doc = {}, settings = {}, client = {} }) {
  const lines = (Array.isArray(doc.positions) ? doc.positions : []).map((position, index) => {
    const quantity = Number(position.quantity ?? 0);
    const netUnitPrice = money(position.price);
    const netAmount = money(quantity * netUnitPrice);
    const category = position.taxCategory ?? (doc.isSmallBusiness ? "SMALL_BUSINESS" : Number(position.taxRate ?? doc.vatRate) === 7 ? "REDUCED" : "STANDARD");
    const rate = category === "SMALL_BUSINESS" ? 0 : Number(position.taxRate ?? doc.vatRate ?? 0);
    return Object.freeze({ id: String(position.id ?? index + 1), name: String(position.description ?? ""), quantity, unitCode: String(position.unit ?? "C62"), netUnitPrice, netAmount, tax: Object.freeze({ category, rate }) });
  });
  const taxMap = new Map();
  for (const line of lines) {
    const key = `${line.tax.category}:${line.tax.rate}`;
    const current = taxMap.get(key) ?? { category: line.tax.category, rate: line.tax.rate, taxableAmount: 0, taxAmount: 0 };
    current.taxableAmount = money(current.taxableAmount + line.netAmount);
    current.taxAmount = line.tax.category === "SMALL_BUSINESS" ? 0 : money(current.taxableAmount * current.rate / 100);
    taxMap.set(key, current);
  }
  const taxBreakdown = [...taxMap.values()].map(Object.freeze);
  const netTotal = money(lines.reduce((sum, line) => sum + line.netAmount, 0));
  const taxTotal = money(taxBreakdown.reduce((sum, group) => sum + group.taxAmount, 0));
  return Object.freeze({
    specification: "EN16931_CORE",
    invoiceNumber: String(doc.number ?? ""), issueDate: String(doc.date ?? ""), typeCode: "380", currency: String(doc.currency ?? settings.currency ?? ""), buyerReference: doc.buyerReference ? String(doc.buyerReference) : null,
    service: Object.freeze({ date: doc.serviceDate || null, periodStart: doc.servicePeriodStart || null, periodEnd: doc.servicePeriodEnd || null, country: String(doc.serviceCountry ?? "") }),
    seller: Object.freeze({ name: String(settings.companyName ?? ""), addressLines: Object.freeze(addressLines(settings.address)), street: settings.sellerStreet || null, houseNumber: settings.sellerHouseNumber || null, postalCode: settings.sellerPostalCode || null, city: settings.sellerCity || null, electronicAddress: settings.sellerElectronicAddress || null, electronicAddressScheme: settings.sellerElectronicAddressScheme || "EM", country: String(settings.sellerCountry ?? doc.sellerCountry ?? ""), taxNumber: settings.sellerTaxNumber || settings.taxId || null, vatId: settings.sellerVatId || null }),
    buyer: Object.freeze({ name: String(client.companyName ?? client.name ?? doc.clientCompanyName ?? doc.clientName ?? ""), contactName: client.contactPerson || doc.clientContactPerson || null, addressLines: Object.freeze(addressLines(client.address ?? doc.clientAddress)), street: doc.clientStreet || client.street || null, houseNumber: doc.clientHouseNumber || client.houseNumber || null, postalCode: doc.clientPostalCode || client.postalCode || null, city: doc.clientCity || client.city || null, electronicAddress: doc.clientElectronicAddress || client.invoiceEmail || client.email || null, electronicAddressScheme: doc.clientElectronicAddressScheme || "EM", country: String(doc.customerCountry ?? ""), type: String(doc.customerType ?? ""), vatId: client.vatId || doc.clientVatId || null }),
    payment: Object.freeze({ dueDate: doc.dueDate || null, termsDays: Number(doc.paymentTermsDays ?? 0), iban: settings.iban || null, bic: settings.bic || null, bankName: settings.bankName || null }),
    notes: Object.freeze({ intro: String(doc.introText ?? ""), footer: String(doc.footerText ?? ""), sellerFooter: String(settings.footerText ?? ""), smallBusiness: doc.smallBusinessNote || null }),
    lines: Object.freeze(lines), taxBreakdown: Object.freeze(taxBreakdown), totals: Object.freeze({ netTotal, taxTotal, grossTotal: money(netTotal + taxTotal) }),
  });
}

export function canonicalInvoiceToRenderPayload(invoice, source = {}) {
  return {
    doc: { ...(source.doc ?? {}), number: invoice.invoiceNumber, date: invoice.issueDate, currency: invoice.currency, buyerReference: invoice.buyerReference, serviceDate: invoice.service.date, servicePeriodStart: invoice.service.periodStart, servicePeriodEnd: invoice.service.periodEnd, serviceCountry: invoice.service.country, sellerCountry: invoice.seller.country, customerCountry: invoice.buyer.country, customerType: invoice.buyer.type, paymentTermsDays: invoice.payment.termsDays, dueDate: invoice.payment.dueDate, positions: invoice.lines.map((line) => ({ id: line.id, description: line.name, quantity: line.quantity, unit: line.unitCode, price: line.netUnitPrice, taxCategory: line.tax.category, taxRate: line.tax.rate })) },
    settings: { ...(source.settings ?? {}), companyName: invoice.seller.name, address: invoice.seller.addressLines.join("\n"), sellerStreet: invoice.seller.street, sellerHouseNumber: invoice.seller.houseNumber, sellerPostalCode: invoice.seller.postalCode, sellerCity: invoice.seller.city, sellerElectronicAddress: invoice.seller.electronicAddress, sellerTaxNumber: invoice.seller.taxNumber, sellerVatId: invoice.seller.vatId, sellerCountry: invoice.seller.country, currency: invoice.currency },
    client: { ...(source.client ?? {}), companyName: invoice.buyer.name, contactPerson: invoice.buyer.contactName, address: invoice.buyer.addressLines.join("\n") },
  };
}
