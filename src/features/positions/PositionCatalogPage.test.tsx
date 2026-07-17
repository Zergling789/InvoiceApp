import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/renderWithProviders";
import { matchesPositionTemplateSearch, PositionCatalogPage } from "./PositionCatalogPage";

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
  it("zeigt den leeren Zustand und öffnet den Dialog für ein neues Produkt oder eine Leistung", async () => {
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    expect(await screen.findByText("Noch keine Produkte oder Leistungen gespeichert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Erstes Produkt oder erste Leistung anlegen" }));
    expect(screen.getByRole("dialog", { name: "Produkt oder Leistung anlegen" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Produktnummer")).not.toBeInTheDocument();
  });
  it("zeigt Produktfelder erst nach Produktauswahl und lässt den Preis leer", async () => {
    const user = userEvent.setup(); renderWithProviders(<PositionCatalogPage />);
    await user.click(await screen.findByRole("button", { name: "Erstes Produkt oder erste Leistung anlegen" }));
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
    expect(screen.getByRole("dialog", { name: "Produkt bearbeiten" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await user.click(screen.getByRole("button", { name: "Aktionen für Pflasterstein" }));
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    expect(screen.getByText("Produkt oder Leistung löschen?")).toBeInTheDocument();
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

  it("sucht auch nach Kategorie und Produktnummer", () => {
    expect(matchesPositionTemplateSearch(template, "baustoff")).toBe(true);
    expect(matchesPositionTemplateSearch(template, "pf-1")).toBe(true);
    expect(matchesPositionTemplateSearch(template, "reinigung")).toBe(false);
  });

  it("zeigt bei Ladefehlern keinen falschen Leerzustand und kann erneut laden", async () => {
    const user = userEvent.setup();
    service.loadPositionTemplates.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([]);
    renderWithProviders(<PositionCatalogPage />);
    expect(await screen.findByText("Produkte und Leistungen konnten nicht geladen werden")).toBeInTheDocument();
    expect(screen.queryByText("Noch keine Produkte oder Leistungen gespeichert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText("Noch keine Produkte oder Leistungen gespeichert")).toBeInTheDocument();
  });
});
