import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import TodosPage from "@/features/todos/TodosPage";

const loadDashboardDataMock = vi.fn();

vi.mock("@/app/dashboard/dashboardService", () => ({
  loadDashboardData: () => loadDashboardDataMock(),
}));

vi.mock("@/app/settings/settingsService", () => ({
  fetchSettings: vi.fn(async () => ({ currency: "EUR", locale: "de-DE" })),
}));

describe("TodosPage loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDashboardDataMock.mockResolvedValue({ clients: [], offers: [], invoices: [] });
  });

  it("does not claim that there are no todos when loading failed", async () => {
    loadDashboardDataMock
      .mockRejectedValueOnce(new Error("private database detail"))
      .mockResolvedValueOnce({ clients: [], offers: [], invoices: [] });
    renderWithProviders(<TodosPage />, { route: "/app/todos" });

    expect(await screen.findByRole("alert")).toHaveTextContent("To-dos konnten nicht geladen werden");
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    expect(screen.queryByText(/Keine offenen To-dos/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(loadDashboardDataMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Keine offenen To-dos/)).toBeVisible();
  });
});
