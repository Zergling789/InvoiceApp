export enum AppView {
  DASHBOARD = "DASHBOARD",
  CLIENTS = "CLIENTS",
  PROJECTS = "PROJECTS",
  OFFERS = "OFFERS",
  INVOICES = "INVOICES",
  SETTINGS = "SETTINGS",
  OFFER_EDITOR = "OFFER_EDITOR",
  INVOICE_EDITOR = "INVOICE_EDITOR",
}

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

export interface TimeEntry {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  description: string;
}

export interface Position {
  id: string;
  description: string;
  quantity: number;
  unit: string; 
  price: number;
}

export enum OfferStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  ACCEPTED = "Accepted",
  REJECTED = "Rejected",
  INVOICED = "Invoiced", 
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
  DRAFT = "Draft",
  SENT = "Sent",
  OVERDUE = "Overdue",
  PAID = "Paid",
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
