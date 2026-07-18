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

  it("opens an overdue invoice on the invoice route", async () => {
    loadDashboardDataMock.mockResolvedValue({
      clients: [{ id: "client-1", companyName: "Musterbetrieb" }],
      offers: [],
      invoices: [{
        id: "invoice-overdue",
        number: "RE-42",
        clientId: "client-1",
        date: "2026-06-01",
        dueDate: "2026-06-15",
        positions: [{ id: "position-1", description: "Arbeit", quantity: 1, price: 100, unit: "Std" }],
        vatRate: 19,
        status: "SENT",
        isSmallBusiness: false,
      }],
    });

    renderWithProviders(<TodosPage />, { route: "/app/todos" });

    expect(await screen.findByText("Überfällige Rechnungen")).toBeVisible();
    expect(screen.getByRole("link", { name: "Öffnen" })).toHaveAttribute(
      "href",
      "/app/invoices/invoice-overdue",
    );
  });
});
