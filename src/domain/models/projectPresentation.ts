import type { Project } from "@/types";
import { formatMoney } from "@/utils/money";
export {
  PROJECT_PHASE_LABELS,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/domain/projects";

export const PROJECT_STATUS_ORDER: Record<Project["status"], number> = {
  active: 0,
  completed: 1,
  cancelled: 2,
  archived: 3,
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
