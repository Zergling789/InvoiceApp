import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as appointmentService from "@/app/calendar/projectAppointmentService";
import * as projectService from "@/app/projects/projectService";
import { renderWithProviders } from "@/test/renderWithProviders";
import CalendarPage from "./CalendarPage";

vi.mock("@/app/calendar/projectAppointmentService", () => ({
  listProjectAppointments: vi.fn(),
}));
vi.mock("@/app/projects/projectService", () => ({
  listProjectsPage: vi.fn(),
}));

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.mocked(projectService.listProjectsPage).mockResolvedValue({
      items: [{
        id: "project-1",
        name: "Terrasse Müller",
        projectNumber: "PR-2026-0001",
      }],
      hasMore: false,
      nextPage: null,
    } as Awaited<ReturnType<typeof projectService.listProjectsPage>>);
    vi.mocked(appointmentService.listProjectAppointments).mockResolvedValue([{
      id: "appointment-1",
      organizationId: "org-1",
      projectId: "project-1",
      title: "Besichtigung vor Ort",
      startsAt: "2026-07-21T08:00:00.000Z",
      endsAt: "2026-07-21T09:00:00.000Z",
      appointmentType: "site_visit",
      createdBy: "user-1",
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
      projectTitle: "Terrasse Müller",
      projectNumber: "PR-2026-0001",
    }]);
  });

  it("shows appointments in the selected week and links to the project", async () => {
    renderWithProviders(<CalendarPage />, {
      route: "/app/calendar?view=week&date=2026-07-20",
    });

    expect(await screen.findAllByText("Besichtigung vor Ort")).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: /Besichtigung vor Ort/ })[0],
    ).toHaveAttribute("href", "/app/projects/project-1?tab=termine");
    expect(screen.getByRole("option", { name: "PR-2026-0001 · Terrasse Müller" })).toBeVisible();
  });
});
