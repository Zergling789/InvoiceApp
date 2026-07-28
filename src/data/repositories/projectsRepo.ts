import type { Project } from "@/domain/types";
import { normalizeProject } from "@/domain/models/Project";
import {
  dbCreateProject,
  dbGetCurrentOrganizationId,
  dbGetCurrentUserId,
  dbGetProject,
  dbGetProjectActivities,
  dbGetRecentProjectActivities,
  dbGetProjectAppointments,
  dbGetProjectMetrics,
  dbGetProjectTasks,
  dbListProjects,
  dbListProjectsPage,
  dbUpdateProject,
  dbUpsertProject,
  type ProjectMetrics,
  type ProjectPageOptions,
} from "@/db/projectsDb";
import type { ProjectCreateInput } from "@/features/projects/projectSchemas";

export async function listProjects(): Promise<Project[]> {
  const projects = await dbListProjects();
  return projects.map(normalizeProject);
}

export async function listProjectsPage(
  options: ProjectPageOptions = {},
){
  const page = await dbListProjectsPage(options);
  return { ...page, items: page.items.map(normalizeProject) };
}

export const getProjectMetrics = (): Promise<ProjectMetrics> => dbGetProjectMetrics();
export const getCurrentOrganizationId = () => dbGetCurrentOrganizationId();
export const getCurrentUserId = () => dbGetCurrentUserId();
export const getProject = (projectId: string) => dbGetProject(projectId);
export const getProjectActivities = (projectId: string) => dbGetProjectActivities(projectId);
export const getRecentProjectActivities = (limit?: number) => dbGetRecentProjectActivities(limit);
export const getProjectTasks = (projectId: string) => dbGetProjectTasks(projectId);
export const getProjectAppointments = (projectId: string) => dbGetProjectAppointments(projectId);
export const createProject = (input: ProjectCreateInput) => dbCreateProject(input);
export const updateProject = (projectId: string, patch: Record<string, unknown>) =>
  dbUpdateProject(projectId, patch);

export async function saveProject(project: Project): Promise<void> {
  await dbUpsertProject(normalizeProject(project));
}
