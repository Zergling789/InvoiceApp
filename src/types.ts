export interface UserSettings {
  name: string;
  companyName: string;
  address: string;
  taxId: string;
  defaultVatRate: number;
  defaultPaymentTerms: number;
  iban: string;
  bic: string;
  bankName: string;
  email: string;
  emailDefaultSubject: string;
  emailDefaultText: string;
  logoUrl?: string;
  primaryColor?: string;
  templateId?: string;
  locale?: string;
  currency?: string;
  prefixInvoice?: string;
  prefixOffer?: string;
  numberPadding?: number;
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
  companyName: string;
  contactPerson: string;
  email: string;
  address: string;
  notes: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  budgetType: "hourly" | "fixed";
  hourlyRate: number;
  budgetTotal: number;
  status: "active" | "completed" | "archived";
}

export interface Position {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

export enum OfferStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  INVOICED = "INVOICED",
}

export interface Offer {
  id: string;
  number: string;
  clientId: string;
  projectId?: string;
  date: string;
  validUntil?: string;
  positions: Position[];
  vatRate: number;
  introText: string;
  footerText: string;
  status: OfferStatus;
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  OVERDUE = "OVERDUE",
  PAID = "PAID",
}

export interface Invoice {
  id: string;
  number: string;
  offerId?: string;
  clientId: string;
  projectId?: string;
  date: string;
  dueDate?: string;
  positions: Position[];
  vatRate: number;
  introText: string;
  footerText: string;
  status: InvoiceStatus;
  paymentDate?: string;
}

export type DocumentType = "offer" | "invoice";

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("de-DE");
};
