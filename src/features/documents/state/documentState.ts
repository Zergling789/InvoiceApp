import { Invoice, InvoiceStatus, Offer, OfferStatus } from "@/types";
import { isInvoiceOverdue, isInvoicePaid } from "@/utils/dashboard";

export type DocType = "invoice" | "offer";

export type InvoicePhase = "draft" | "issued" | "sent" | "overdue" | "paid" | "canceled";
export type OfferPhase = "draft" | "sent" | "accepted" | "rejected" | "invoiced";
export type DocumentPhase = InvoicePhase | OfferPhase;

export type DocumentWorkflowActionKey =
  | "FINALIZE_INVOICE"
  | "SEND_INVOICE"
  | "MARK_INVOICE_PAID"
  | "SEND_DUNNING"
  | "SEND_OFFER"
  | "COPY_RECIPIENT_LINK"
  | "CONVERT_OFFER";

export type DocumentWorkflowAction = {
  key: DocumentWorkflowActionKey;
  label: string;
  hint: string;
};

export type InvoiceCapabilities = {
  canEdit: boolean;
  canFinalize: boolean;
  canSend: boolean;
  canSendReminder: boolean;
  canSendDunning: boolean;
  canMarkSent: boolean;
  canMarkPaid: boolean;
  canCancel: boolean;
  canAccept: false;
  canReject: false;
  canConvertToInvoice: false;
};

export type OfferCapabilities = {
  canEdit: boolean;
  canSend: boolean;
  canAccept: boolean;
  canReject: boolean;
  canConvertToInvoice: boolean;
  canFinalize: false;
  canSendReminder: false;
  canSendDunning: false;
  canMarkSent: false;
  canMarkPaid: false;
  canCancel: false;
};

const hasSentData = (value?: string | null) => Boolean(value && String(value).length > 0);

const getInvoicePaymentDate = (invoice: Invoice) =>
  invoice.paymentDate ?? (invoice as { payment_date?: string | null }).payment_date ?? null;

const getInvoiceFinalizedAt = (invoice: Invoice) =>
  invoice.finalizedAt ?? (invoice as { finalized_at?: string | null }).finalized_at ?? null;

const getInvoiceSentCount = (invoice: Invoice) =>
  invoice.sentCount ?? (invoice as { sent_count?: number | null }).sent_count ?? 0;

const getOfferAcceptedAt = (offer: Offer) =>
  (offer as { acceptedAt?: string | null; accepted_at?: string | null }).acceptedAt ??
  (offer as { acceptedAt?: string | null; accepted_at?: string | null }).accepted_at ??
  null;

const getOfferInvoicedAt = (offer: Offer) =>
  (offer as { invoicedAt?: string | null; invoiced_at?: string | null }).invoicedAt ??
  (offer as { invoicedAt?: string | null; invoiced_at?: string | null }).invoiced_at ??
  null;

const getOfferSentAt = (offer: Offer) =>
  offer.sentAt ?? (offer as { sent_at?: string | null }).sent_at ?? null;

const isLockedDocument = (doc: { isLocked?: boolean; finalizedAt?: string | null; is_locked?: boolean }) =>
  Boolean(doc.isLocked ?? doc.is_locked ?? false) || Boolean(doc.finalizedAt ?? null);

export const getInvoicePhase = (invoice: Invoice, now = new Date()): InvoicePhase => {
  if (invoice.status === InvoiceStatus.CANCELED) return "canceled";
  const paymentDate = getInvoicePaymentDate(invoice);
  if (paymentDate || isInvoicePaid(invoice) || invoice.status === InvoiceStatus.PAID) return "paid";

  if (isInvoiceOverdue(invoice, now)) return "overdue";

  const hasBeenSent =
    hasSentData(invoice.sentAt) ||
    hasSentData(invoice.lastSentAt) ||
    getInvoiceSentCount(invoice) > 0 ||
    invoice.status === InvoiceStatus.SENT;

  if (hasBeenSent) return "sent";

  const isFinalized = Boolean(getInvoiceFinalizedAt(invoice)) || isLockedDocument(invoice) || invoice.status === InvoiceStatus.ISSUED;

  if (isFinalized) return "issued";

  return "draft";
};

export const getOfferPhase = (offer: Offer): OfferPhase => {
  if (offer.status === OfferStatus.INVOICED || getOfferInvoicedAt(offer)) return "invoiced";
  if (offer.status === OfferStatus.ACCEPTED || getOfferAcceptedAt(offer)) return "accepted";
  if (offer.status === OfferStatus.REJECTED) return "rejected";
  if (offer.status === OfferStatus.SENT || getOfferSentAt(offer)) return "sent";
  return "draft";
};

export function getDocumentCapabilities(
  docType: "invoice",
  doc: Invoice,
  now?: Date
): InvoiceCapabilities;
export function getDocumentCapabilities(
  docType: "offer",
  doc: Offer,
  now?: Date
): OfferCapabilities;
export function getDocumentCapabilities(
  docType: DocType,
  doc: Invoice | Offer,
  now?: Date
): InvoiceCapabilities | OfferCapabilities;
export function getDocumentCapabilities(
  docType: DocType,
  doc: Invoice | Offer,
  now = new Date()
): InvoiceCapabilities | OfferCapabilities {
  if (docType === "invoice") {
    const invoice = doc as Invoice;
    const phase = getInvoicePhase(invoice, now);
    const locked = isLockedDocument(invoice);
    const paid = phase === "paid";
    const canceled = phase === "canceled";

    return {
      canEdit: !locked && phase === "draft",
      canFinalize: phase === "draft" && !locked,
      canSend: ["issued", "sent", "overdue"].includes(phase),
      canSendReminder: phase === "sent",
      canSendDunning: phase === "overdue",
      canMarkSent: phase === "issued",
      canMarkPaid: !paid && !canceled && ["issued", "sent", "overdue"].includes(phase),
      canCancel: !paid && !canceled && ["issued", "sent", "overdue"].includes(phase),
      canAccept: false,
      canReject: false,
      canConvertToInvoice: false,
    };
  }

  const offer = doc as Offer;
  const phase = getOfferPhase(offer);
  const locked = isLockedDocument(offer as { isLocked?: boolean; finalizedAt?: string | null; is_locked?: boolean });

  return {
    canEdit: !locked && phase === "draft",
    canSend: ["draft", "sent"].includes(phase),
    canAccept: phase === "sent",
    canReject: phase === "sent",
    canConvertToInvoice: phase === "accepted",
    canFinalize: false,
    canSendReminder: false,
    canSendDunning: false,
    canMarkSent: false,
    canMarkPaid: false,
    canCancel: false,
  };
}

export function getNextDocumentAction(
  docType: "invoice",
  doc: Invoice,
  now?: Date,
): DocumentWorkflowAction | null;
export function getNextDocumentAction(
  docType: "offer",
  doc: Offer,
  now?: Date,
): DocumentWorkflowAction | null;
export function getNextDocumentAction(
  docType: DocType,
  doc: Invoice | Offer,
  now = new Date(),
): DocumentWorkflowAction | null {
  if (docType === "invoice") {
    const phase = getInvoicePhase(doc as Invoice, now);
    if (phase === "draft") {
      return {
        key: "FINALIZE_INVOICE",
        label: "Rechnung finalisieren",
        hint: "Rechnung prüfen und die endgültige Rechnungsnummer vergeben.",
      };
    }
    if (phase === "issued") {
      return {
        key: "SEND_INVOICE",
        label: "Rechnung senden",
        hint: "Die fertige Rechnung per E-Mail an den Kunden senden.",
      };
    }
    if (phase === "sent") {
      return {
        key: "MARK_INVOICE_PAID",
        label: "Zahlung erfassen",
        hint: "Nach dem Zahlungseingang die Rechnung als bezahlt markieren.",
      };
    }
    if (phase === "overdue") {
      return {
        key: "SEND_DUNNING",
        label: "Mahnung senden",
        hint: "Den Kunden auf die überfällige Zahlung hinweisen.",
      };
    }
    return null;
  }

  const phase = getOfferPhase(doc as Offer);
  if (phase === "draft") {
    return {
      key: "SEND_OFFER",
      label: "Angebot senden",
      hint: "Das Angebot per E-Mail senden und die Rückmeldung online erhalten.",
    };
  }
  if (phase === "sent") {
    return {
      key: "COPY_RECIPIENT_LINK",
      label: "Empfänger-Link kopieren",
      hint: "Den persönlichen Link erneut teilen oder die Rückmeldung abwarten.",
    };
  }
  if (phase === "accepted") {
    return {
      key: "CONVERT_OFFER",
      label: "Rechnung aus Angebot erstellen",
      hint: "Kunde und Positionen automatisch in eine neue Rechnung übernehmen.",
    };
  }
  return null;
}
