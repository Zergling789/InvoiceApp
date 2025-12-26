import type { Project } from "@/domain/types";
import { normalizeProject } from "@/domain/models/Project";
import { dbListProjects, dbUpsertProject } from "@/db/projectsDb";

export async function listProjects(): Promise<Project[]> {
  const projects = await dbListProjects();
  return projects.map(normalizeProject);
}

export async function saveProject(project: Project): Promise<void> {
  await dbUpsertProject(normalizeProject(project));
}
