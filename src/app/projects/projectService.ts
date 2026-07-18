import type { Project } from "@/types";
import * as repo from "@/data/repositories/projectsRepo";
import type { ProjectPageOptions } from "@/db/projectsDb";

export const listProjects = (): Promise<Project[]> => repo.listProjects();
export const listProjectsPage = (options: ProjectPageOptions = {}) => repo.listProjectsPage(options);
export const getProjectMetrics = () => repo.getProjectMetrics();
export const saveProject = (project: Project): Promise<void> => repo.saveProject(project);
