import type { Invoice, Offer, Project } from "@/types";

export const PROJECT_STATUSES = ["active", "completed", "cancelled", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PHASES = [
  "inquiry",
  "qualification",
  "site_visit",
  "planning",
  "quote_draft",
  "quote_sent",
  "quote_follow_up",
  "accepted",
  "scheduled",
  "in_progress",
  "completion",
  "invoiced",
  "payment_pending",
  "completed",
  "lost",
  "cancelled",
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const PROJECT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PROJECT_TASK_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

export const PROJECT_TASK_STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  completed: "Erledigt",
  cancelled: "Abgebrochen",
};

export const PROJECT_TYPES = [
  { value: "terrace", label: "Terrasse" },
  { value: "paving", label: "Pflasterarbeiten" },
  { value: "garden_redesign", label: "Gartenumgestaltung" },
  { value: "fence", label: "Zaunbau" },
  { value: "wall", label: "Mauerbau" },
  { value: "maintenance", label: "Pflege" },
  { value: "tree_work", label: "Baumarbeiten" },
  { value: "irrigation", label: "Bewässerung" },
  { value: "lighting", label: "Beleuchtung" },
  { value: "other", label: "Sonstiges" },
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Aktiv",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
  archived: "Archiviert",
};

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  inquiry: "Anfrage",
  qualification: "Qualifizierung",
  site_visit: "Besichtigung",
  planning: "Planung",
  quote_draft: "Angebot in Arbeit",
  quote_sent: "Angebot versendet",
  quote_follow_up: "Angebot nachfassen",
  accepted: "Angenommen",
  scheduled: "Eingeplant",
  in_progress: "In Ausführung",
  completion: "Abschluss",
  invoiced: "Abgerechnet",
  payment_pending: "Zahlung ausstehend",
  completed: "Abgeschlossen",
  lost: "Nicht gewonnen",
  cancelled: "Abgebrochen",
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  urgent: "Dringend",
};

export type ProjectActivityType =
  | "project_created"
  | "project_updated"
  | "phase_changed"
  | "status_changed"
  | "customer_assigned"
  | "quote_created"
  | "quote_sent"
  | "quote_viewed"
  | "quote_accepted"
  | "quote_rejected"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_paid"
  | "invoice_overdue"
  | "task_created"
  | "task_completed"
  | "appointment_created"
  | "note_added"
  | "file_uploaded";

export type ProjectActivity = {
  id: string;
  projectId: string;
  activityType: ProjectActivityType;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ProjectTask = {
  id: string;
  organizationId: string;
  projectId?: string | null;
  customerId?: string | null;
  title: string;
  description?: string | null;
  status: ProjectTaskStatus;
  priority: ProjectPriority;
  dueAt?: string | null;
  assignedUserId?: string | null;
  completedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAppointment = {
  id: string;
  projectId?: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  appointmentType:
    | "site_visit"
    | "project_start"
    | "work_day"
    | "delivery"
    | "inspection"
    | "handover"
    | "follow_up"
    | "other";
};

export type ProjectContext = {
  project: Project;
  offers: Offer[];
  invoices: Invoice[];
  tasks?: ProjectTask[];
  appointments?: ProjectAppointment[];
  now?: Date;
};

export type SuggestedNextAction = {
  type: string;
  label: string;
  at?: string | null;
  reason: string;
};

export type ProjectPrimaryAction = {
  label: string;
  to: string;
};
