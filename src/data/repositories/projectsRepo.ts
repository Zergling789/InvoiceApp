import type { Project } from "@/domain/types";
import { normalizeProject } from "@/domain/models/Project";
import {
  dbGetProjectMetrics,
  dbListProjects,
  dbListProjectsPage,
  dbUpsertProject,
  type ProjectMetrics,
  type ProjectPageOptions,
} from "@/db/projectsDb";
import type { CursorPage } from "@/db/cursorPagination";

export async function listProjects(): Promise<Project[]> {
  const projects = await dbListProjects();
  return projects.map(normalizeProject);
}

export async function listProjectsPage(
  options: ProjectPageOptions = {},
): Promise<CursorPage<Project>> {
  const page = await dbListProjectsPage(options);
  return { ...page, items: page.items.map(normalizeProject) };
}

export const getProjectMetrics = (): Promise<ProjectMetrics> => dbGetProjectMetrics();

export async function saveProject(project: Project): Promise<void> {
  await dbUpsertProject(normalizeProject(project));
}
