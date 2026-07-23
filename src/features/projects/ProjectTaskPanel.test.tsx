import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import * as projectTaskService from "@/app/tasks/projectTaskService";
import type { ProjectTask } from "@/domain/projects";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ProjectTaskPanel } from "./ProjectTaskPanel";

vi.mock("@/app/tasks/projectTaskService", () => ({
  createProjectTask: vi.fn(),
  updateProjectTask: vi.fn(),
}));

const task: ProjectTask = {
  id: "task-1",
  organizationId: "org-1",
  projectId: "project-1",
  customerId: "client-1",
  title: "Materialliste prüfen",
  description: null,
  status: "open",
  priority: "high",
  dueAt: "2026-07-30T08:00:00.000Z",
  assignedUserId: "user-1",
  completedAt: null,
  createdBy: "user-1",
  createdAt: "2026-07-23T10:00:00.000Z",
  updatedAt: "2026-07-23T10:00:00.000Z",
};

describe("ProjectTaskPanel", () => {
  it("creates a project task with the selected assignee", async () => {
    const user = userEvent.setup();
    const onTasksChange = vi.fn();
    const onActivitiesChange = vi.fn().mockResolvedValue(undefined);
    vi.mocked(projectTaskService.createProjectTask).mockResolvedValue(task);

    renderWithProviders(
      <ProjectTaskPanel
        projectId="project-1"
        tasks={[]}
        assignees={[{ userId: "user-1", displayName: "Anna Müller" }]}
        onTasksChange={onTasksChange}
        onActivitiesChange={onActivitiesChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aufgabe erstellen" }));
    await user.type(screen.getByLabelText("Titel"), "Materialliste prüfen");
    await user.selectOptions(screen.getByLabelText("Zuständig"), "user-1");
    await user.click(screen.getByRole("button", { name: "Aufgabe anlegen" }));

    expect(projectTaskService.createProjectTask).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        title: "Materialliste prüfen",
        assignedUserId: "user-1",
      }),
    );
    expect(onTasksChange).toHaveBeenCalledWith([task]);
    expect(onActivitiesChange).toHaveBeenCalledOnce();
  });

  it("completes an open task", async () => {
    const user = userEvent.setup();
    const completed = {
      ...task,
      status: "completed" as const,
      completedAt: "2026-07-23T12:00:00.000Z",
    };
    const onTasksChange = vi.fn();
    const onActivitiesChange = vi.fn().mockResolvedValue(undefined);
    vi.mocked(projectTaskService.updateProjectTask).mockResolvedValue(completed);

    renderWithProviders(
      <ProjectTaskPanel
        projectId="project-1"
        tasks={[task]}
        assignees={[{ userId: "user-1", displayName: "Anna Müller" }]}
        onTasksChange={onTasksChange}
        onActivitiesChange={onActivitiesChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Erledigen" }));

    expect(projectTaskService.updateProjectTask).toHaveBeenCalledWith("task-1", {
      status: "completed",
    });
    expect(onTasksChange).toHaveBeenCalledWith([completed]);
    expect(onActivitiesChange).toHaveBeenCalledOnce();
  });
});
