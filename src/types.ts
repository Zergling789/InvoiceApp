import { formatMoney } from "@/utils/money";

export interface UserSettings {
  name: string;
  companyName: string;
  address: string;
  taxId: string;
  sellerTaxNumber?: string;
  sellerVatId?: string;
  sellerCountry?: SupportedCountry;
  sellerStreet?: string;
  sellerHouseNumber?: string;
  sellerPostalCode?: string;
  sellerCity?: string;
  sellerElectronicAddress?: string;
  sellerElectronicAddressScheme?: string;
  defaultVatRate: number;
  defaultPaymentTerms: number;
  iban: string;
  bic: string;
  bankName: string;
  email: string;
  emailDefaultSubject: string;
  emailDefaultText: string;
  isSmallBusiness: boolean;
  smallBusinessNote?: string | null;
  logoUrl?: string;
  primaryColor?: string;
  templateId?: string;
  locale?: string;
  currency?: string;
  prefixInvoice?: string;
  prefixOffer?: string;
  numberPadding?: number;
  invoiceNumberPrefix?: string;
  invoiceNumberNext?: number;
  invoiceNumberPadding?: number;
  invoiceNumberIncludeYear?: boolean;
  footerText?: string;
  defaultSenderIdentityId?: string | null;
}

export interface SenderIdentity {
  id: string;
  email: string;
  displayName?: string | null;
  status: "pending" | "verified" | "disabled";
  verifiedAt?: string | null;
  lastVerificationSentAt?: string | null;
}

export interface Client {
  id: string;
  createdAt?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  address: string;
  notes: string;
  customerNumber?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  street?: string;
  houseNumber?: string;
  addressAddition?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  legalForm?: string;
  industry?: string;
  vatId?: string;
  taxNumber?: string;
  registrationNumber?: string;
  invoiceEmail?: string;
  billingAddress?: string;
  paymentTermsDays?: number | null;
  currency?: string;
  defaultVatRate?: number | null;
  preferredLanguage?: string;
  preferredDeliveryMethod?: "email" | "download" | "post";
  source?: string;
  tags?: string[];
  lastContactAt?: string | null;
  nextFollowUpAt?: string | null;
}

export interface Project {
  id: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
  clientId?: string;
  projectNumber?: string | null;
  name: string;
  description?: string | null;
  budgetType: "hourly" | "fixed";
  hourlyRate: number;
  budgetTotal: number;
  status: ProjectStatus;
  phase: ProjectPhase;
  priority: ProjectPriority;
  projectType?: string | null;
  source?: string | null;
  estimatedValue?: number | null;
  acceptedValue?: number | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  actualEndDate?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  nextActionType?: string | null;
  nextActionAt?: string | null;
  nextActionLabel?: string | null;
  assignedUserId?: string | null;
  createdBy?: string;
  archivedAt?: string | null;
  lastActivityAt?: string | null;
}

export type ProjectStatus = "active" | "completed" | "cancelled" | "archived";
export type ProjectPhase =
  | "inquiry"
  | "qualification"
  | "site_visit"
  | "planning"
  | "quote_draft"
  | "quote_sent"
  | "quote_follow_up"
  | "accepted"
  | "scheduled"
  | "in_progress"
  | "completion"
  | "invoiced"
  | "payment_pending"
  | "completed"
  | "lost"
  | "cancelled";
export type ProjectPriority = "low" | "normal" | "high" | "urgent";

export interface Position {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  taxCategory?: TaxCategory;
  taxRate?: number;
  taxExemptionReason?: string;
}

export type TaxCategory =
  | "STANDARD"
  | "REDUCED"
  | "ZERO"
  | "EXEMPT"
  | "SMALL_BUSINESS"
  | "REVERSE_CHARGE";

export type CustomerType = "BUSINESS" | "PRIVATE";
export type SupportedCountry = "DE";

export enum OfferStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  INVOICED = "INVOICED",
}

export interface Offer {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  number: string;
  clientId: string;
  projectId?: string;
  currency: string;
  date: string;
  validUntil?: string;
  positions: Position[];
  vatRate: number;
  introText: string;
  footerText: string;
  status: OfferStatus;
  sentAt?: string | null;
  lastSentAt?: string | null;
  lastSentTo?: string | null;
  sentCount?: number;
  sentVia?: "EMAIL" | "MANUAL" | "EXPORT" | null;
  invoiceId?: string | null;
  rejectionReason?: string | null;
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  ISSUED = "ISSUED",
  SENT = "SENT",
  PAID = "PAID",
  CANCELED = "CANCELED",
}

export interface Invoice {
  id: string;
  createdAt?: string;
  number: string | null;
  offerId?: string;
  clientId: string;
  clientName?: string;
  clientCompanyName?: string | null;
  clientContactPerson?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientVatId?: string | null;
  clientAddress?: string | null;
  clientStreet?: string | null;
  clientHouseNumber?: string | null;
  clientPostalCode?: string | null;
  clientCity?: string | null;
  clientElectronicAddress?: string | null;
  clientElectronicAddressScheme?: string | null;
  projectId?: string;
  date: string;
  serviceDate?: string;
  servicePeriodStart?: string;
  servicePeriodEnd?: string;
  sellerCountry?: string;
  customerCountry?: string;
  customerType?: CustomerType;
  serviceCountry?: string;
  currency?: string;
  buyerReference?: string;
  paymentTermsDays: number;
  dueDate?: string;
  positions: Position[];
  vatRate: number;
  isSmallBusiness: boolean;
  smallBusinessNote?: string | null;
  introText: string;
  footerText: string;
  status: InvoiceStatus;
  paymentDate?: string;
  paidAt?: string | null;
  canceledAt?: string | null;
  isOverdue?: boolean;
  isLocked?: boolean;
  finalizedAt?: string | null;
  sentAt?: string | null;
  lastSentAt?: string | null;
  lastSentTo?: string | null;
  sentCount?: number;
  sentVia?: "EMAIL" | "MANUAL" | "EXPORT" | null;
}

export type DocumentType = "offer" | "invoice";

export const formatCurrency = (amount: number, locale = "de-DE", currency = "EUR") => {
  return formatMoney(amount, currency, locale);
};

export const formatDate = (dateStr: string, locale = "de-DE") => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(locale);
};
