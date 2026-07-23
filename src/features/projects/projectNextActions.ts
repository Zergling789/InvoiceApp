import { InvoiceStatus, OfferStatus } from "@/types";
import type { ProjectContext, SuggestedNextAction } from "@/domain/projects";

const DAY = 86_400_000;

export function getSuggestedNextAction(context: ProjectContext): SuggestedNextAction | null {
  const { project, offers, invoices } = context;
  const now = context.now ?? new Date();
  const overdueInvoice = invoices.find(
    (invoice) =>
      invoice.status !== InvoiceStatus.PAID &&
      invoice.status !== InvoiceStatus.CANCELED &&
      Boolean(invoice.dueDate) &&
      new Date(`${invoice.dueDate}T23:59:59`).getTime() < now.getTime(),
  );
  if (overdueInvoice) {
    return {
      type: "follow_up_payment",
      label: "Zahlung nachverfolgen",
      reason: `Rechnung ${overdueInvoice.number ?? ""} ist überfällig.`.trim(),
    };
  }

  const sentOffer = offers
    .filter((offer) => offer.status === OfferStatus.SENT && (offer.lastSentAt || offer.sentAt))
    .sort((a, b) => String(b.lastSentAt || b.sentAt).localeCompare(String(a.lastSentAt || a.sentAt)))[0];
  if (sentOffer) {
    const sentAt = new Date(sentOffer.lastSentAt || sentOffer.sentAt || 0);
    if (now.getTime() - sentAt.getTime() >= 7 * DAY) {
      return {
        type: "follow_up_quote",
        label: "Kunden nachfassen",
        reason: "Das Angebot wurde vor mindestens sieben Tagen versendet.",
      };
    }
  }

  if (project.phase === "accepted" && !project.startDate) {
    return {
      type: "schedule_project",
      label: "Projektstart planen",
      reason: "Der Auftrag ist angenommen, aber noch nicht terminiert.",
    };
  }
  if (project.phase === "completion" && invoices.length === 0) {
    return {
      type: "create_invoice",
      label: "Rechnung erstellen",
      reason: "Das Projekt ist im Abschluss und hat noch keine Rechnung.",
    };
  }
  return null;
}

