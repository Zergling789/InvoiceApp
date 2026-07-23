import * as repo from "@/data/repositories/projectTasksRepo";
import type { ProjectTaskListOptions } from "@/db/projectTasksDb";
import {
  projectTaskCreateSchema,
  projectTaskUpdateSchema,
  type ProjectTaskCreateInput,
  type ProjectTaskUpdateInput,
} from "@/features/projects/projectTaskSchemas";

export const listProjectTasks = (options?: ProjectTaskListOptions) =>
  repo.listProjectTasks(options);
export const listProjectTaskAssignees = (projectId: string) =>
  repo.listProjectTaskAssignees(projectId);

export const createProjectTask = (
  projectId: string,
  input: ProjectTaskCreateInput,
) => repo.createProjectTask(projectId, projectTaskCreateSchema.parse(input));

export const updateProjectTask = (
  taskId: string,
  patch: ProjectTaskUpdateInput,
) => repo.updateProjectTask(taskId, projectTaskUpdateSchema.parse(patch));
