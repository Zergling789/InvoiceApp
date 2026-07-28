import type { Project } from "@/types";
import * as repo from "@/data/repositories/projectsRepo";
import type { ProjectPageOptions } from "@/db/projectsDb";
import { projectCreateSchema, type ProjectCreateInput } from "@/features/projects/projectSchemas";

export const listProjects = (): Promise<Project[]> => repo.listProjects();
export const listProjectsPage = (options: ProjectPageOptions = {}) => repo.listProjectsPage(options);
export const getProjectMetrics = () => repo.getProjectMetrics();
export const getCurrentUserId = () => repo.getCurrentUserId();
export const saveProject = (project: Project): Promise<void> => repo.saveProject(project);
export const getProject = (projectId: string) => repo.getProject(projectId);
export const getProjectActivities = (projectId: string) => repo.getProjectActivities(projectId);
export const getRecentProjectActivities = (limit?: number) => repo.getRecentProjectActivities(limit);
export const getProjectTasks = (projectId: string) => repo.getProjectTasks(projectId);
export const getProjectAppointments = (projectId: string) => repo.getProjectAppointments(projectId);
export const createProject = (input: ProjectCreateInput) =>
  repo.createProject(projectCreateSchema.parse(input));
export const updateProject = (projectId: string, patch: Record<string, unknown>) =>
  repo.updateProject(projectId, patch);
export const archiveProject = (projectId: string) =>
  repo.updateProject(projectId, { status: "archived" });
