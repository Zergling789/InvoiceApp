import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import Projects from "./Projects";

const refreshProjects = vi.fn().mockResolvedValue(undefined);
const refreshClients = vi.fn().mockResolvedValue(undefined);

vi.mock("@/app/projects/projectQueries", () => ({
  useProjects: () => ({
    projects: [
      { id: "p-1", clientId: "c-1", name: "Neue Terrasse", budgetType: "hourly", hourlyRate: 75, budgetTotal: 12, status: "active" },
      { id: "p-2", clientId: "c-1", name: "Gartenhaus", budgetType: "fixed", hourlyRate: 0, budgetTotal: 2500, status: "completed" },
    ],
    loading: false,
    error: null,
    refresh: refreshProjects,
  }),
}));

vi.mock("@/app/clients/clientQueries", () => ({
  useClients: () => ({ clients: [{ id: "c-1", companyName: "Müller Gartenbau", contactPerson: "", email: "", address: "", notes: "" }], loading: false, error: null, refresh: refreshClients }),
}));

describe("Projects", () => {
  beforeEach(() => {
    refreshProjects.mockClear();
    refreshClients.mockClear();
  });

  it("shows understandable project and budget labels", () => {
    renderWithProviders(<Projects />, { route: "/app/projects" });
    expect(screen.getByText("Neue Terrasse")).toBeVisible();
    expect(screen.getAllByText("Laufend").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Abgeschlossen").length).toBeGreaterThan(1);
    expect(screen.getByText(/12 Std. geplant/)).toBeVisible();
    expect(screen.queryByText("hourly")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("filters projects by status", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Projects />, { route: "/app/projects" });
    await user.selectOptions(screen.getByLabelText("Projektstatus filtern"), "completed");
    expect(screen.queryByText("Neue Terrasse")).not.toBeInTheDocument();
    expect(screen.getByText("Gartenhaus")).toBeVisible();
  });
});
