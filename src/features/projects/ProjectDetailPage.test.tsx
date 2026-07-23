import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import ProjectDetailPage from "./ProjectDetailPage";

const getProjectMock = vi.fn();
const getClientMock = vi.fn();

vi.mock("@/app/projects/projectService", () => ({
  getProject: (...args: unknown[]) => getProjectMock(...args),
  getProjectActivities: vi.fn().mockResolvedValue([]),
  getProjectAppointments: vi.fn().mockResolvedValue([]),
  updateProject: vi.fn(),
}));
vi.mock("@/app/tasks/projectTaskService", () => ({
  listProjectTasks: vi.fn().mockResolvedValue([]),
  listProjectTaskAssignees: vi.fn().mockResolvedValue([]),
  createProjectTask: vi.fn(),
  updateProjectTask: vi.fn(),
}));
vi.mock("@/app/offers/offerService", () => ({
  listOffersForProject: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/app/invoices/invoiceService", () => ({
  listInvoicesForProject: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/app/clients/clientService", () => ({
  get: (...args: unknown[]) => getClientMock(...args),
}));

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    getProjectMock.mockReset();
    getClientMock.mockReset();
    getProjectMock.mockResolvedValue({
      id: "project-1",
      organizationId: "org-1",
      clientId: "client-1",
      projectNumber: "PR-2026-0001",
      name: "Terrasse Müller",
      description: null,
      status: "active",
      phase: "inquiry",
      priority: "high",
      budgetType: "fixed",
      hourlyRate: 0,
      budgetTotal: 0,
      estimatedValue: 12_000,
      acceptedValue: null,
      projectType: "terrace",
      source: null,
      startDate: null,
      targetEndDate: null,
      actualEndDate: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      country: "DE",
      nextActionType: null,
      nextActionAt: null,
      nextActionLabel: null,
      assignedUserId: null,
      createdBy: "user-1",
      createdAt: "2026-07-23T10:00:00.000Z",
      updatedAt: "2026-07-23T10:00:00.000Z",
      archivedAt: null,
      lastActivityAt: null,
    });
    getClientMock.mockResolvedValue({
      id: "client-1",
      companyName: "",
      firstName: "Anna",
      lastName: "Müller",
      contactPerson: "Anna Müller",
    });
  });

  it("shows the phase-specific primary action and project document area", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/app/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>,
      { route: "/app/projects/project-1" },
    );

    expect(await screen.findByRole("heading", { name: "Terrasse Müller" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Besichtigung planen/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dokumente" }));
    expect(screen.getByText("Noch keine Dokumente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neues Angebot für Projekt" })).toHaveAttribute(
      "href",
      expect.stringContaining("projectId=project-1"),
    );
  });
});
