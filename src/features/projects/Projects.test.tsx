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
  { id: "p-1", clientId: "c-1", name: "Neue Terrasse", budgetType: "hourly", hourlyRate: 75, budgetTotal: 12, status: "active" },
  { id: "p-2", clientId: "c-1", name: "Gartenhaus", budgetType: "fixed", hourlyRate: 0, budgetTotal: 2500, status: "completed" },
];

vi.mock("@/app/projects/projectQueries", () => ({
  useProjectPages: ({ status, search, matchingClientIds }: { status: string; search: string; matchingClientIds: string[] }) => ({
    projects: projects
      .filter((project) => status === "all" || project.status === status)
      .filter((project) => !search || project.name.toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE")) || matchingClientIds.includes(project.clientId)),
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
}));

vi.mock("@/app/clients/clientQueries", () => ({
  useClientSummaries: () => ({ clients: [{ id: "c-1", companyName: "Müller Gartenbau", firstName: "", lastName: "", contactPerson: "" }], loading: false, error: null, refresh: refreshClients }),
}));

describe("Projects", () => {
  beforeEach(() => {
    refreshProjects.mockClear();
    refreshClients.mockClear();
    refreshMetrics.mockClear();
    loadMoreProjects.mockClear();
  });

  it("shows understandable project and budget labels", () => {
    renderWithProviders(<Projects />, { route: "/app/projects" });
    expect(screen.getByText("Neue Terrasse")).toBeVisible();
    expect(screen.getAllByText("Laufend").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Abgeschlossen").length).toBeGreaterThan(1);
    expect(screen.getByText(/12 Std. geplant/)).toBeVisible();
    expect(screen.queryByText("hourly")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    expect(screen.getByText("900,00 €")).toBeVisible();
  });

  it("filters projects by status", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: "/app/projects" });
    await user.selectOptions(screen.getByLabelText("Projektstatus filtern"), "completed");
    expect(screen.queryByText("Neue Terrasse")).not.toBeInTheDocument();
    expect(screen.getByText("Gartenhaus")).toBeVisible();
  });

  it("finds projects by customer name after the search delay", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: "/app/projects" });

    await user.type(screen.getByLabelText("Projekte durchsuchen"), "Müller");

    expect(await screen.findByText("Neue Terrasse")).toBeVisible();
    expect(screen.getByText("Gartenhaus")).toBeVisible();
  });
});
