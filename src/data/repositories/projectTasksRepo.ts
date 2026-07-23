import {
  dbCreateProjectTask,
  dbListProjectTaskAssignees,
  dbListProjectTasks,
  dbUpdateProjectTask,
  type ProjectTaskListOptions,
} from "@/db/projectTasksDb";

export const listProjectTasks = (options?: ProjectTaskListOptions) =>
  dbListProjectTasks(options);
export const listProjectTaskAssignees = (projectId: string) =>
  dbListProjectTaskAssignees(projectId);
export const createProjectTask = (
  projectId: string,
  input: Record<string, unknown>,
) => dbCreateProjectTask(projectId, input);
export const updateProjectTask = (
  taskId: string,
  patch: Record<string, unknown>,
) => dbUpdateProjectTask(taskId, patch);
