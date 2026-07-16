import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import { PositionCatalogPage } from "./PositionCatalogPage";

const service = vi.hoisted(() => ({
  loadPositionTemplates: vi.fn(), loadPositionGroups: vi.fn(), createPositionTemplate: vi.fn(),
  updatePositionTemplate: vi.fn(), deletePositionTemplate: vi.fn(), createPositionGroup: vi.fn(),
  updatePositionGroup: vi.fn(), deletePositionGroup: vi.fn(),
}));
vi.mock("@/app/positions/positionCatalogService", () => service);
vi.mock("@/app/settings/settingsService", () => ({ fetchSettings: vi.fn(async () => ({ isSmallBusiness: false })) }));

const template = { id: "p1", kind: "PRODUCT" as const, name: "Pflasterstein", description: "", category: "Baustoff", unit: "m²", default_quantity: 1, default_unit_price: null, tax_category: "STANDARD" as const, tax_rate: 19, product_number: "PF-1", manufacturer: "Werk", image_url: null };

describe("PositionCatalogPage", () => {
  beforeEach(() => { vi.clearAllMocks(); service.loadPositionTemplates.mockResolvedValue([]); service.loadPositionGroups.mockResolvedValue([]); });
  it("zeigt den leeren Zustand und öffnet den Dialog für einen neuen Eintrag", async () => {
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    expect(await screen.findByText("Noch keine Produkte oder Leistungen gespeichert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ersten Eintrag anlegen" }));
    expect(screen.getByRole("dialog", { name: "Neuer Eintrag" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Produktnummer")).not.toBeInTheDocument();
  });
  it("zeigt Produktfelder erst nach Produktauswahl und lässt den Preis leer", async () => {
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    await user.click(await screen.findByRole("button", { name: "Ersten Eintrag anlegen" }));
    await user.click(screen.getByRole("button", { name: "Produkt" }));
    await user.click(screen.getByRole("button", { name: /Weitere Angaben/ }));
    expect(screen.getByText("Produktnummer")).toBeInTheDocument();
    expect(screen.getByText("Hersteller")).toBeInTheDocument();
    expect(screen.getByText("Preis wird beim Verwenden ergänzt")).toBeInTheDocument();
  });
  it("wechselt zum Paket-Tab und öffnet den Paketdialog", async () => {
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    await user.click(await screen.findByRole("tab", { name: "Pakete" }));
    expect(screen.getByText("Noch keine Pakete gespeichert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Neues Paket/ }));
    expect(screen.getByRole("dialog", { name: "Neues Paket" })).toBeInTheDocument();
  });
  it("bearbeitet einen Eintrag und verlangt vor dem Löschen eine Bestätigung", async () => {
    service.loadPositionTemplates.mockResolvedValue([template]);
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    await screen.findByText("Pflasterstein");
    await user.click(screen.getByRole("button", { name: "Aktionen für Pflasterstein" }));
    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));
    expect(screen.getByRole("dialog", { name: "Eintrag bearbeiten" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    expect(screen.getByText("Eintrag löschen?")).toBeInTheDocument();
    expect(service.deletePositionTemplate).not.toHaveBeenCalled();
  });
  it("fügt einen Eintrag zum Paket hinzu und markiert ihn optional", async () => {
    service.loadPositionTemplates.mockResolvedValue([template]);
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    await screen.findByText("Pflasterstein");
    await user.click(screen.getByRole("button", { name: "Aktionen für Pflasterstein" }));
    await user.click(screen.getByRole("button", { name: "Zu Paket hinzufügen" }));
    const optional = screen.getByRole("checkbox", { name: "Optionale Position" });
    await user.click(optional); expect(optional).toBeChecked();
    await user.type(screen.getByLabelText("Paketname *"), "Terrasse");
    await user.click(screen.getByRole("button", { name: "Paket speichern" }));
    await waitFor(() => expect(service.createPositionGroup).toHaveBeenCalledWith(expect.objectContaining({ name: "Terrasse", items: [expect.objectContaining({ optional: true })] })));
  });
});
