import type { Project } from "@/types";
import { formatMoney } from "@/utils/money";

export const PROJECT_STATUS_LABELS: Record<Project["status"], string> = {
  active: "Laufend",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

export const PROJECT_STATUS_ORDER: Record<Project["status"], number> = {
  active: 0,
  completed: 1,
  archived: 2,
};

export function formatProjectBudget(project: Project, currency = "EUR", locale = "de-DE") {
  if (project.budgetType === "fixed") {
    return `Festpreis ${formatMoney(project.budgetTotal, currency, locale)}`;
  }

  const hours = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(project.budgetTotal)} Std.`;
  const rate = formatMoney(project.hourlyRate, currency, locale);
  return `${hours} geplant · ${rate}/Std.`;
}

export function getProjectPlannedValue(project: Project) {
  return project.budgetType === "fixed"
    ? project.budgetTotal
    : project.budgetTotal * project.hourlyRate;
}
