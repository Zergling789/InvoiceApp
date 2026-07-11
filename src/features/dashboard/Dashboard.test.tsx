import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/renderWithProviders";
import Dashboard from "./Dashboard";

vi.mock("@/app/dashboard/dashboardService", () => ({
  loadDashboardData: vi.fn(async () => ({ clients: [], offers: [], invoices: [] })),
}));

vi.mock("@/app/settings/settingsService", () => ({
  fetchSettings: vi.fn(async () => ({ companyName: "Everest AG", currency: "EUR", locale: "de-DE" })),
}));

describe("Dashboard-Navigation", () => {
  beforeEach(() => vi.clearAllMocks());

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
});
