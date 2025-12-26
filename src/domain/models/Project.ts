import type { Project } from "../types";

export function createEmptyProject(id: string, clientId = ""): Project {
  return {
    id,
    clientId,
    name: "",
    budgetType: "hourly",
    hourlyRate: 0,
    budgetTotal: 0,
    status: "active",
  };
}

export function normalizeProject(project: Project): Project {
  return {
    ...project,
    name: project.name ?? "",
    budgetType: project.budgetType ?? "hourly",
    hourlyRate: Number(project.hourlyRate ?? 0),
    budgetTotal: Number(project.budgetTotal ?? 0),
    status: project.status ?? "active",
  };
}
