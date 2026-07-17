import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import Dashboard from "./Dashboard";

const loadDashboardDataMock = vi.fn();

vi.mock("@/app/dashboard/dashboardService", () => ({
  loadDashboardData: () => loadDashboardDataMock(),
}));

vi.mock("@/app/settings/settingsService", () => ({
  fetchSettings: vi.fn(async () => ({ companyName: "Everest AG", currency: "EUR", locale: "de-DE" })),
}));

describe("Dashboard-Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDashboardDataMock.mockResolvedValue({ clients: [], offers: [], invoices: [] });
  });

  it("verwendet kanonische Erstellen- und Dokumentlinks", async () => {
    renderWithProviders(<Dashboard />, { route: "/app" });

    expect(await screen.findByRole("heading", { name: /Hallo Everest AG/i })).toBeVisible();
    expect(screen.getByRole("link", { name: "Angebot erstellen" })).toHaveAttribute("href", "/app/offers/new");
    expect(screen.getByRole("link", { name: "Rechnung erstellen" })).toHaveAttribute("href", "/app/invoices/new");
    expect(screen.getByRole("link", { name: "Kunde anlegen" })).toHaveAttribute("href", "/app/customers/new");
    expect(screen.getByText("Offen", { selector: ".app-eyebrow" }).closest("a")).toHaveAttribute("href", "/app/documents?type=invoice&status=issued,sent,overdue");
    expect(screen.getByText("Potenzial", { selector: ".app-eyebrow" }).closest("a")).toHaveAttribute("href", "/app/documents?type=offer&status=draft,sent");
    expect(screen.getByText("Überfällig", { selector: ".app-eyebrow" }).closest("a")).toHaveAttribute("href", "/app/documents?type=invoice&status=overdue");
  });

  it("zeigt keine redundante Schnellaktionssektion", async () => {
    renderWithProviders(<Dashboard />, { route: "/app" });
    await screen.findByRole("heading", { name: /Hallo Everest AG/i });
    expect(screen.queryByRole("heading", { name: "Schnellaktionen" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Alle To-dos" })).toHaveAttribute("href", "/app/todos");
  });

  it("zeigt nach einem Ladefehler keine leeren Kennzahlen und kann erneut laden", async () => {
    loadDashboardDataMock
      .mockRejectedValueOnce(new Error("private database detail"))
      .mockResolvedValueOnce({ clients: [], offers: [], invoices: [] });
    renderWithProviders(<Dashboard />, { route: "/app" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard konnte nicht geladen werden");
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Cashflow")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(loadDashboardDataMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Cashflow")).toBeVisible();
  });
});
