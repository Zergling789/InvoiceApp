import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import Projects from "./Projects";

const refreshProjects = vi.fn().mockResolvedValue(undefined);
const refreshClients = vi.fn().mockResolvedValue(undefined);
const refreshMetrics = vi.fn().mockResolvedValue(undefined);
const loadMoreProjects = vi.fn().mockResolvedValue(undefined);

const projects = [
  { id: "p-1", clientId: "c-1", projectNumber: "PR-2026-0001", name: "Neue Terrasse", budgetType: "fixed", hourlyRate: 0, budgetTotal: 900, estimatedValue: 900, status: "active", phase: "quote_sent", priority: "urgent", nextActionLabel: "Kunden nachfassen" },
  { id: "p-2", clientId: "c-1", projectNumber: "PR-2026-0002", name: "Gartenhaus", budgetType: "fixed", hourlyRate: 0, budgetTotal: 2500, estimatedValue: 2500, status: "completed", phase: "completed", priority: "normal" },
];

vi.mock("@/app/projects/projectQueries", () => ({
  useProjectPages: ({ statuses, search }: { statuses?: string[] | null; search?: string }) => ({
    projects: projects
      .filter((project) => statuses == null || statuses.includes(project.status))
      .filter((project) => !search || `${project.name} Müller Gartenbau`.toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE"))),
    loading: false,
    loadingMore: false,
    error: null,
    loadMoreError: null,
    hasMore: false,
    refresh: refreshProjects,
    loadMore: loadMoreProjects,
  }),
  useProjectMetrics: () => ({
    metrics: { activeCount: 1, plannedValue: 900 },
    loading: false,
    error: null,
    refresh: refreshMetrics,
  }),
  useCurrentProjectUserId: () => "user-1",
}));

vi.mock("@/app/clients/clientQueries", () => ({
  useClientSummaries: () => ({ clients: [{ id: "c-1", companyName: "Müller Gartenbau", firstName: "", lastName: "", contactPerson: "" }], loading: false, error: null, refresh: refreshClients }),
}));

describe("Projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows project cards and the desktop work table", () => {
    renderWithProviders(<Projects />, { route: "/app/projects" });
    expect(screen.getAllByText("Neue Terrasse").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Angebot versendet").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/900,00/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("project-mobile-cards")).toBeInTheDocument();
  });

  it("filters projects by status on the server-facing query contract", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: "/app/projects" });
    await user.selectOptions(screen.getByLabelText("Projektstatus filtern"), "completed");
    expect(screen.queryByText("Neue Terrasse")).not.toBeInTheDocument();
    expect(screen.getAllByText("Gartenhaus").length).toBeGreaterThan(0);
  });

  it("finds projects by customer name after the search delay", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: "/app/projects" });
    await user.type(screen.getByLabelText("Projekte durchsuchen"), "Müller");
    expect((await screen.findAllByText("Neue Terrasse")).length).toBeGreaterThan(0);
  });
});
