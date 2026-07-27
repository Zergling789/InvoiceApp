import { InvoiceStatus, OfferStatus } from "@/types";
import type { ProjectContext, SuggestedNextAction } from "@/domain/projects";

const DAY = 86_400_000;
const QUOTE_FOLLOW_UP_DAYS = 7;

const TERMINAL_PHASES = new Set(["completed", "lost", "cancelled"]);
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "archived"]);

function latestSentOffer(context: ProjectContext) {
  return context.offers
    .filter((offer) => offer.status === OfferStatus.SENT && (offer.lastSentAt || offer.sentAt))
    .sort((a, b) => String(b.lastSentAt || b.sentAt).localeCompare(String(a.lastSentAt || a.sentAt)))[0];
}

function hasUpcomingAppointment(context: ProjectContext, now: Date) {
  return Boolean(context.appointments?.some((appointment) => new Date(appointment.endsAt).getTime() >= now.getTime()));
}

function hasActiveTask(context: ProjectContext) {
  return Boolean(context.tasks?.some((task) => task.status === "open" || task.status === "in_progress"));
}

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

  if (TERMINAL_PHASES.has(project.phase) || TERMINAL_STATUSES.has(project.status)) return null;

  if (!project.clientId) {
    return {
      type: "assign_customer",
      label: "Kunden zuordnen",
      reason: "Dem Projekt ist noch kein Kunde zugeordnet.",
    };
  }

  if ((project.phase === "inquiry" || project.phase === "qualification") && !hasUpcomingAppointment(context, now)) {
    return {
      type: "schedule_site_visit",
      label: "Besichtigung planen",
      reason: "Für die Anfrage ist noch kein zukünftiger Termin geplant.",
    };
  }

  if ((project.phase === "site_visit" || project.phase === "planning") && offers.length === 0) {
    return {
      type: "create_quote",
      label: "Angebot vorbereiten",
      reason: "Die Planung läuft, aber es wurde noch kein Angebot angelegt.",
    };
  }

  const draftOffer = offers.find((offer) => offer.status === OfferStatus.DRAFT);
  if (project.phase === "quote_draft" && draftOffer) {
    return {
      type: "finish_quote",
      label: "Angebot fertigstellen",
      reason: `Angebot ${draftOffer.number || ""} ist noch ein Entwurf.`.trim(),
    };
  }

  const sentOffer = latestSentOffer(context);
  if (sentOffer) {
    const sentAt = new Date(sentOffer.lastSentAt || sentOffer.sentAt || 0);
    if (now.getTime() - sentAt.getTime() >= QUOTE_FOLLOW_UP_DAYS * DAY) {
      return {
        type: "follow_up_quote",
        label: "Kunden nachfassen",
        reason: `Das Angebot wurde vor mindestens ${QUOTE_FOLLOW_UP_DAYS} Tagen versendet.`,
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

  if ((project.phase === "scheduled" || project.phase === "in_progress") && !hasActiveTask(context)) {
    return {
      type: "create_project_tasks",
      label: "Arbeitsschritte planen",
      reason: "Für das geplante Projekt sind keine offenen Arbeitsschritte vorhanden.",
    };
  }

  if (project.phase === "in_progress" && !hasUpcomingAppointment(context, now)) {
    return {
      type: "schedule_next_work",
      label: "Nächsten Einsatz planen",
      reason: "Das Projekt läuft, hat aber keinen zukünftigen Termin.",
    };
  }

  if (project.phase === "completion" && invoices.length === 0) {
    return {
      type: "create_invoice",
      label: "Rechnung erstellen",
      reason: "Das Projekt ist im Abschluss und hat noch keine Rechnung.",
    };
  }

  const draftInvoice = invoices.find((invoice) => invoice.status === InvoiceStatus.DRAFT);
  if ((project.phase === "invoiced" || project.phase === "payment_pending") && draftInvoice) {
    return {
      type: "finish_invoice",
      label: "Rechnung fertigstellen",
      reason: "Für das Projekt liegt noch eine nicht ausgestellte Rechnung vor.",
    };
  }

  return null;
}
