import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsView from "./SettingsView";
import { renderWithProviders } from "@/test/renderWithProviders";

const { fetchSettingsMock, listSenderIdentitiesMock, getAccountDeletionStatusMock } = vi.hoisted(() => ({
  fetchSettingsMock: vi.fn(),
  listSenderIdentitiesMock: vi.fn(),
  getAccountDeletionStatusMock: vi.fn(),
}));

vi.mock("@/app/settings/settingsService", () => ({ fetchSettings: (...args: unknown[]) => fetchSettingsMock(...args), saveSettings: vi.fn() }));
vi.mock("@/app/senderIdentities/senderIdentitiesService", () => ({ createSenderIdentity: vi.fn(), disableSenderIdentity: vi.fn(), listSenderIdentities: (...args: unknown[]) => listSenderIdentitiesMock(...args), resendSenderIdentity: vi.fn(), sendTestEmail: vi.fn(), setDefaultSenderIdentity: vi.fn() }));
vi.mock("@/app/account/accountDataService", () => ({ cancelAccountDeletion: vi.fn(), downloadAccountData: vi.fn(), getAccountDeletionStatus: (...args: unknown[]) => getAccountDeletionStatusMock(...args), requestAccountDeletion: vi.fn() }));
vi.mock("@/features/settings/BrandingSettingsSection", () => ({ BrandingSettingsSection: () => <div>Dokumentgestaltung</div> }));
vi.mock("@/supabaseClient", () => ({ supabase: { auth: { signOut: vi.fn() } } }));

const settings = { name: "Anna", companyName: "Musterbetrieb", address: "Musterweg 1", taxId: "", sellerTaxNumber: "12/345/67890", sellerVatId: "", sellerCountry: "DE", defaultVatRate: 19, defaultPaymentTerms: 14, iban: "", bic: "", bankName: "", email: "anna@example.de", emailDefaultSubject: "Dokument {nummer}", emailDefaultText: "Anbei.", isSmallBusiness: false, smallBusinessNote: "", currency: "EUR", locale: "de-DE", numberPadding: 4 };

describe("SettingsView navigation", () => {
  beforeEach(() => {
    fetchSettingsMock.mockReset();
    listSenderIdentitiesMock.mockReset();
    getAccountDeletionStatusMock.mockReset();
    fetchSettingsMock.mockResolvedValue(settings);
    listSenderIdentitiesMock.mockResolvedValue([]);
    getAccountDeletionStatusMock.mockResolvedValue({ request: null });
  });

  it("shows one understandable settings area at a time", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsView />, { route: "/app/settings" });
    expect(await screen.findByText("Firmendaten")).toBeInTheDocument();
    expect(screen.queryByText("E-Mail Versand")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "E-Mail" }));
    expect(screen.getByText("E-Mail Versand")).toBeInTheDocument();
    expect(screen.queryByText("Firmendaten")).not.toBeInTheDocument();
  });

  it("does not expose empty defaults after a loading failure and can retry", async () => {
    const user = userEvent.setup();
    fetchSettingsMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(settings);
    renderWithProviders(<SettingsView />, { route: "/app/settings" });
    expect(await screen.findByText("Einstellungen konnten nicht geladen werden")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Einstellungen speichern" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(screen.getByText("Firmendaten")).toBeInTheDocument());
    expect(fetchSettingsMock).toHaveBeenCalledTimes(2);
  });

  it("loads section-specific server data only after opening that section", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsView />, { route: "/app/settings" });

    expect(await screen.findByText("Firmendaten")).toBeInTheDocument();
    expect(listSenderIdentitiesMock).not.toHaveBeenCalled();
    expect(getAccountDeletionStatusMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "E-Mail" }));
    await waitFor(() => expect(listSenderIdentitiesMock).toHaveBeenCalledTimes(1));
    expect(getAccountDeletionStatusMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Konto & Datenschutz" }));
    await waitFor(() => expect(getAccountDeletionStatusMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Firma & Steuer" }));
    await user.click(screen.getByRole("button", { name: "E-Mail" }));
    expect(listSenderIdentitiesMock).toHaveBeenCalledTimes(1);
  });

  it("uses understandable German labels for document settings", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsView />, { route: "/app/settings" });

    expect(await screen.findByText("Firmendaten")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dokumente" }));

    expect(screen.getByText("Dokument-Standardwerte")).toBeVisible();
    expect(screen.getByText("Sprache und Währung")).toBeVisible();
    expect(screen.getByText("Kürzel für Rechnungen")).toBeVisible();
    expect(screen.getByText("Anzahl Ziffern")).toBeVisible();
    expect(screen.queryByText("Locale & Währung")).not.toBeInTheDocument();
    expect(screen.queryByText("Padding")).not.toBeInTheDocument();
  });
});
