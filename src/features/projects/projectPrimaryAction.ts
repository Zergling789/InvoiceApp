import type { ProjectPrimaryAction } from "@/domain/projects";
import type { Project } from "@/types";

export function getProjectPrimaryAction(project: Project): ProjectPrimaryAction {
  const returnUrl = `/app/projects/${project.id}?tab=dokumente`;
  const projectQuery = `projectId=${encodeURIComponent(project.id)}&clientId=${encodeURIComponent(project.clientId ?? "")}&returnUrl=${encodeURIComponent(returnUrl)}`;
  switch (project.phase) {
    case "inquiry":
    case "qualification":
      return { label: "Besichtigung planen", to: `/app/projects/${project.id}?tab=termine&action=new` };
    case "site_visit":
    case "planning":
      return { label: "Angebot vorbereiten", to: `/app/offers/new?${projectQuery}` };
    case "quote_draft":
      return { label: "Angebot fertigstellen", to: `/app/projects/${project.id}?tab=dokumente` };
    case "quote_sent":
    case "quote_follow_up":
      return { label: "Rückmeldung nachverfolgen", to: `/app/projects/${project.id}?tab=aktivitaeten` };
    case "accepted":
      return { label: "Auftrag planen", to: `/app/projects/${project.id}?tab=termine&action=new` };
    case "scheduled":
    case "in_progress":
      return { label: "Fortschritt dokumentieren", to: `/app/projects/${project.id}?tab=aktivitaeten&action=note` };
    case "completion":
      return { label: "Rechnung erstellen", to: `/app/invoices/new?${projectQuery}` };
    case "invoiced":
    case "payment_pending":
      return { label: "Zahlung überwachen", to: `/app/projects/${project.id}?tab=dokumente` };
    case "completed":
    case "lost":
    case "cancelled":
      return { label: "Projektübersicht öffnen", to: `/app/projects/${project.id}` };
  }
}
