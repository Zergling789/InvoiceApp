import type { Project } from "@/types";
import * as repo from "@/data/repositories/projectsRepo";

export const listProjects = (): Promise<Project[]> => repo.listProjects();
export const saveProject = (project: Project): Promise<void> => repo.saveProject(project);
