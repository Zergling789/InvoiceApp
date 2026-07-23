import type { Project, ProjectPhase } from "@/types";

export type ProjectTransitionEvent =
  | "QUOTE_CREATED"
  | "QUOTE_SENT"
  | "QUOTE_ACCEPTED"
  | "QUOTE_REJECTED"
  | "INVOICE_CREATED"
  | "INVOICE_SENT"
  | "INVOICE_PAID";

const PHASE_RANK: Record<ProjectPhase, number> = {
  inquiry: 10,
  qualification: 20,
  site_visit: 30,
  planning: 40,
  quote_draft: 50,
  quote_sent: 60,
  quote_follow_up: 70,
  accepted: 80,
  scheduled: 90,
  in_progress: 100,
  completion: 110,
  invoiced: 120,
  payment_pending: 130,
  completed: 140,
  lost: 900,
  cancelled: 910,
};

const EVENT_PHASE: Partial<Record<ProjectTransitionEvent, ProjectPhase>> = {
  QUOTE_CREATED: "quote_draft",
  QUOTE_SENT: "quote_sent",
  QUOTE_ACCEPTED: "accepted",
  QUOTE_REJECTED: "lost",
  INVOICE_CREATED: "invoiced",
  INVOICE_SENT: "payment_pending",
};

export function applyProjectTransition({
  project,
  event,
}: {
  project: Project;
  event: ProjectTransitionEvent;
}): Project {
  const target = EVENT_PHASE[event];
  if (!target) return project;
  if (project.phase === "lost" || project.phase === "cancelled") return project;
  if (PHASE_RANK[target] < PHASE_RANK[project.phase]) return project;
  return { ...project, phase: target };
}

export const ALLOWED_MANUAL_PHASE_TRANSITIONS: Record<ProjectPhase, readonly ProjectPhase[]> = {
  inquiry: ["qualification", "site_visit", "lost", "cancelled"],
  qualification: ["site_visit", "planning", "quote_draft", "lost", "cancelled"],
  site_visit: ["planning", "quote_draft", "lost", "cancelled"],
  planning: ["quote_draft", "lost", "cancelled"],
  quote_draft: ["quote_sent", "lost", "cancelled"],
  quote_sent: ["quote_follow_up", "accepted", "lost", "cancelled"],
  quote_follow_up: ["accepted", "lost", "cancelled"],
  accepted: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completion", "cancelled"],
  completion: ["invoiced", "completed"],
  invoiced: ["payment_pending", "completed"],
  payment_pending: ["completed"],
  completed: [],
  lost: ["qualification", "quote_draft"],
  cancelled: [],
};

export function canManuallyTransition(from: ProjectPhase, to: ProjectPhase) {
  return from === to || ALLOWED_MANUAL_PHASE_TRANSITIONS[from].includes(to);
}

