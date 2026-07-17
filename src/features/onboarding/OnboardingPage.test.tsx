import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserSettings } from "@/types";
import OnboardingPage from "./OnboardingPage";

const getProgress = vi.fn();
const saveProgress = vi.fn();
const fetchSettings = vi.fn();
const saveSettings = vi.fn();
const listClients = vi.fn();

vi.mock("@/app/onboarding/onboardingService", () => ({
  getOnboardingProgress: () => getProgress(),
  saveOnboardingProgress: (...args: unknown[]) => saveProgress(...args),
}));

vi.mock("@/app/settings/settingsService", () => ({
  fetchSettings: () => fetchSettings(),
  saveSettings: (...args: unknown[]) => saveSettings(...args),
}));

vi.mock("@/app/clients/clientService", () => ({
  list: () => listClients(),
}));

vi.mock("@/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            email: "max@example.de",
            user_metadata: {
              first_name: "Max",
              last_name: "Muster",
              company_name: "Musterbetrieb",
            },
          },
        },
      }),
    },
  },
}));

const settings: UserSettings = {
  name: "",
  companyName: "",
  address: "",
  taxId: "",
  sellerTaxNumber: "",
  sellerVatId: "",
  sellerCountry: "DE",
  sellerStreet: "",
  sellerHouseNumber: "",
  sellerPostalCode: "",
  sellerCity: "",
  defaultVatRate: 19,
  defaultPaymentTerms: 14,
  iban: "",
  bic: "",
  bankName: "",
  email: "",
  emailDefaultSubject: "Dokument {nummer}",
  emailDefaultText: "Bitte im Anhang finden Sie das Dokument.",
  isSmallBusiness: false,
};

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSettings.mockResolvedValue(settings);
    listClients.mockResolvedValue([]);
  });

  it("übernimmt Registrierungsdaten und startet die Einrichtung", async () => {
    getProgress.mockResolvedValue({
      step: "WELCOME",
      completedAt: null,
      clientId: null,
    });
    saveProgress.mockResolvedValue({
      step: "COMPANY",
      completedAt: null,
      clientId: null,
    });

    render(
      <MemoryRouter initialEntries={["/app/onboarding"]}>
        <OnboardingPage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Einrichtung starten" }),
    );

    expect(await screen.findByDisplayValue("Musterbetrieb")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Max Muster")).toBeInTheDocument();
    expect(screen.getByDisplayValue("max@example.de")).toBeInTheDocument();
    expect(saveProgress).toHaveBeenCalledWith("COMPANY", {});
  });

  it("verlangt eine steuerliche Identifikation", async () => {
    getProgress.mockResolvedValue({
      step: "TAX",
      completedAt: null,
      clientId: null,
    });

    render(
      <MemoryRouter initialEntries={["/app/onboarding"]}>
        <OnboardingPage />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Steuerangaben speichern" }),
    );

    expect(
      await screen.findByText(
        "Bitte gib deine Steuernummer oder deine USt-IdNr. an.",
      ),
    ).toBeInTheDocument();
    expect(saveSettings).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
  });

  it("bietet nach Abschluss den direkten Weg zu den Dokumenten", async () => {
    getProgress.mockResolvedValue({
      step: "DONE",
      completedAt: "2026-07-17T10:00:00.000Z",
      clientId: "client-1",
    });

    render(
      <MemoryRouter initialEntries={["/app/onboarding"]}>
        <OnboardingPage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Du bist startklar")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: "Zu meinen Dokumenten" }),
    ).toBeInTheDocument();
  });
});
