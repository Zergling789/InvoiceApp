import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsView from "./SettingsView";
import { renderWithProviders } from "@/test/renderWithProviders";

const fetchSettingsMock = vi.fn();

vi.mock("@/app/settings/settingsService", () => ({ fetchSettings: (...args: unknown[]) => fetchSettingsMock(...args), saveSettings: vi.fn() }));
vi.mock("@/app/senderIdentities/senderIdentitiesService", () => ({ createSenderIdentity: vi.fn(), disableSenderIdentity: vi.fn(), listSenderIdentities: vi.fn().mockResolvedValue([]), resendSenderIdentity: vi.fn(), sendTestEmail: vi.fn(), setDefaultSenderIdentity: vi.fn() }));
vi.mock("@/app/account/accountDataService", () => ({ cancelAccountDeletion: vi.fn(), downloadAccountData: vi.fn(), getAccountDeletionStatus: vi.fn().mockResolvedValue({ request: null }), requestAccountDeletion: vi.fn() }));
vi.mock("@/features/settings/BrandingSettingsSection", () => ({ BrandingSettingsSection: () => <div>Dokumentgestaltung</div> }));
vi.mock("@/supabaseClient", () => ({ supabase: { auth: { signOut: vi.fn() } } }));

const settings = { name: "Anna", companyName: "Musterbetrieb", address: "Musterweg 1", taxId: "", sellerTaxNumber: "12/345/67890", sellerVatId: "", sellerCountry: "DE", defaultVatRate: 19, defaultPaymentTerms: 14, iban: "", bic: "", bankName: "", email: "anna@example.de", emailDefaultSubject: "Dokument {nummer}", emailDefaultText: "Anbei.", isSmallBusiness: false, smallBusinessNote: "", currency: "EUR", locale: "de-DE", numberPadding: 4 };

describe("SettingsView navigation", () => {
  beforeEach(() => { fetchSettingsMock.mockReset(); fetchSettingsMock.mockResolvedValue(settings); });

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
});
