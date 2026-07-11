import type { Client, Position } from "@/types";
import { InvoiceStatus, OfferStatus } from "@/types";

export type EditorSeed = {
  id: string;
  number: string | null;
  date: string;
  serviceDate?: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  sellerCountry?: string;
  customerCountry?: string;
  customerType?: "BUSINESS" | "PRIVATE";
  serviceCountry?: string;
  buyerReference?: string;
  paymentTermsDays?: number;
  dueDate?: string;
  validUntil?: string;
  vatRate: number;
  isSmallBusiness?: boolean;
  smallBusinessNote?: string | null;
  introText: string;
  footerText: string;
  currency?: string;
};

export type DocumentFormData = {
  id: string;
  number: string | null;
  date: string;
  serviceDate?: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  sellerCountry?: string;
  customerCountry?: string;
  customerType?: "BUSINESS" | "PRIVATE";
  serviceCountry?: string;
  buyerReference?: string;
  paymentTermsDays?: number;
  dueDate?: string;
  validUntil?: string;
  clientId: string;
  clientName?: string;
  clientCompanyName?: string | null;
  clientContactPerson?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientVatId?: string | null;
  clientAddress?: string | null;
  clientStreet?: string | null; clientHouseNumber?: string | null; clientPostalCode?: string | null; clientCity?: string | null; clientElectronicAddress?: string | null; clientElectronicAddressScheme?: string | null;
  positions: Position[];
  introText: string;
  footerText: string;
  status: InvoiceStatus | OfferStatus;
  vatRate: number;
  isSmallBusiness?: boolean;
  smallBusinessNote?: string | null;
  currency?: string;
  paymentDate?: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  offerId?: string;
  projectId?: string;
  isLocked?: boolean;
  finalizedAt?: string | null;
  sentAt?: string | null;
  lastSentAt?: string | null;
  lastSentTo?: string | null;
  sentCount?: number;
  sentVia?: "EMAIL" | "MANUAL" | "EXPORT" | null;
  invoiceId?: string | null;
};

export function toNumberOrZero(value: unknown): number {
  const number =
    typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

export function createDocumentPositionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function applyDefaultTaxToPositions(positions: Position[], vatRate: number, isSmallBusiness = false): Position[] {
  const taxCategory = isSmallBusiness ? "SMALL_BUSINESS" : vatRate === 7 ? "REDUCED" : vatRate === 0 ? "ZERO" : "STANDARD";
  return positions.map(({ taxCategory: _ignoredCategory, taxRate: _ignoredRate, ...position }) => ({ ...position, taxCategory, taxRate: isSmallBusiness ? 0 : vatRate }));
}

export function applyDocumentTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => data[key] ?? match);
}

export function buildClientSnapshot(client?: Client | null) {
  const companyName = client?.companyName ?? "";
  const contactPerson = client?.contactPerson ?? "";
  return {
    clientName: companyName.trim() ? companyName : contactPerson,
    clientCompanyName: companyName,
    clientContactPerson: contactPerson,
    clientEmail: client?.email ?? "",
    clientPhone: null,
    clientVatId: null,
    clientAddress: client?.address ?? "",
    clientStreet: client?.street ?? "", clientHouseNumber: client?.houseNumber ?? "", clientPostalCode: client?.postalCode ?? "", clientCity: client?.city ?? "", clientElectronicAddress: client?.invoiceEmail || client?.email || "", clientElectronicAddressScheme: "EM",
  };
}

export function buildDocumentFormData(
  seed: EditorSeed,
  initial: Partial<DocumentFormData> | undefined,
  isInvoice: boolean,
  defaultCurrency?: string
): DocumentFormData {
  const base: DocumentFormData = {
    id: seed.id,
    number: seed.number ?? null,
    date: seed.date,
    serviceDate: seed.serviceDate ?? seed.date,
    servicePeriodStart: seed.servicePeriodStart,
    servicePeriodEnd: seed.servicePeriodEnd,
    sellerCountry: "DE", customerCountry: "DE", customerType: "BUSINESS", serviceCountry: "DE", buyerReference: "",
    paymentTermsDays: seed.paymentTermsDays ?? 14,
    dueDate: seed.dueDate,
    validUntil: seed.validUntil,
    clientId: "",
    clientName: "",
    clientCompanyName: "",
    clientContactPerson: "",
    clientEmail: "",
    clientPhone: null,
    clientVatId: null,
    clientAddress: "",
    positions: [],
    introText: seed.introText ?? "",
    footerText: seed.footerText ?? "",
    status: isInvoice ? InvoiceStatus.DRAFT : OfferStatus.DRAFT,
    vatRate: seed.vatRate ?? 0,
    isSmallBusiness: seed.isSmallBusiness ?? false,
    smallBusinessNote: seed.smallBusinessNote ?? "",
    currency: defaultCurrency ?? "EUR",
    sentCount: 0,
    isLocked: false,
    finalizedAt: null,
    sentAt: null,
    lastSentAt: null,
    lastSentTo: null,
    sentVia: null,
    invoiceId: null,
  };
  const merged = { ...base, ...(initial ?? {}) };

  return {
    ...merged,
    clientId: merged.clientId ?? "",
    clientName: merged.clientName ?? "",
    clientCompanyName: merged.clientCompanyName ?? "",
    clientContactPerson: merged.clientContactPerson ?? "",
    clientEmail: merged.clientEmail ?? "",
    clientPhone: merged.clientPhone ?? null,
    clientVatId: merged.clientVatId ?? null,
    clientAddress: merged.clientAddress ?? "",
    positions: Array.isArray(merged.positions) ? merged.positions : [],
    introText: merged.introText ?? "",
    footerText: merged.footerText ?? "",
    vatRate: Number(merged.vatRate ?? 0),
    paymentTermsDays: Number(merged.paymentTermsDays ?? 14),
    isSmallBusiness: Boolean(merged.isSmallBusiness ?? false),
    smallBusinessNote: merged.smallBusinessNote ?? "",
    currency: merged.currency ?? defaultCurrency ?? "EUR",
  };
}
