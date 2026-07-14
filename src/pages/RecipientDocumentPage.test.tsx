import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import RecipientDocumentPage from "@/pages/RecipientDocumentPage";
import { renderWithProviders } from "@/test/renderWithProviders";

const loadRecipientDocument = vi.fn();
const respondToOffer = vi.fn();

vi.mock("@/app/recipient/recipientService", () => ({
  loadRecipientDocument: (token: string) => loadRecipientDocument(token),
  respondToOffer: (...args: unknown[]) => respondToOffer(...args),
}));

describe("RecipientDocumentPage", () => {
  beforeEach(() => {
    respondToOffer.mockReset();
    respondToOffer.mockResolvedValue({ response: "REJECTED" });
    loadRecipientDocument.mockResolvedValue({
      type: "offer",
      doc: {
        number: "ANG-2026-0042",
        date: "2026-07-14",
        validUntil: "2026-07-31",
        introText: "Vielen Dank für Ihre Anfrage.",
        footerText: "Wir freuen uns auf die Zusammenarbeit.",
        positions: [{ description: "Beratung", quantity: 2, price: 100 }],
        vatRate: 19,
      },
      client: { companyName: "Beispiel GmbH" },
      settings: { companyName: "Muster Consulting", currency: "EUR" },
      response: null,
      responseReason: null,
      expiresAt: "2026-08-14T00:00:00.000Z",
    });
  });

  it("übermittelt eine optionale Ablehnungsbegründung", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes><Route path="/recipient/:token" element={<RecipientDocumentPage />} /></Routes>,
      { route: "/recipient/test-token" }
    );

    const reason = await screen.findByLabelText(/Optionale Begründung bei Ablehnung/);
    await user.type(reason, "Der Zeitrahmen passt leider nicht.");
    await user.click(screen.getByRole("button", { name: "Angebot ablehnen" }));

    await waitFor(() => expect(respondToOffer).toHaveBeenCalledWith("test-token", "REJECTED", "Der Zeitrahmen passt leider nicht."));
    expect(await screen.findByText(/Begründung: Der Zeitrahmen passt leider nicht\./)).toBeInTheDocument();
  });

  it("zeigt das öffentliche Angebot mit Erklärung und Antwortmöglichkeiten", async () => {
    renderWithProviders(
      <Routes><Route path="/recipient/:token" element={<RecipientDocumentPage />} /></Routes>,
      { route: "/recipient/test-token" }
    );

    await waitFor(() => expect(loadRecipientDocument).toHaveBeenCalledWith("test-token"));
    expect(await screen.findByText("Ihr Angebot von Muster Consulting")).toBeInTheDocument();
    expect(screen.getByText("Vielen Dank für Ihre Anfrage.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Angebot annehmen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Angebot ablehnen" })).toBeInTheDocument();
  });

  it("ersetzt ein angenommenes Angebot durch eine Dankeseite", async () => {
    loadRecipientDocument.mockResolvedValueOnce({
      type: "offer",
      doc: { number: "ANG-2026-0042", positions: [] },
      client: { companyName: "Beispiel GmbH" },
      settings: { companyName: "Muster Consulting", currency: "EUR" },
      response: "ACCEPTED",
      responseReason: null,
      expiresAt: "2026-08-14T00:00:00.000Z",
    });

    renderWithProviders(
      <Routes><Route path="/recipient/:token" element={<RecipientDocumentPage />} /></Routes>,
      { route: "/recipient/test-token" }
    );

    expect(await screen.findByRole("heading", { name: "Vielen Dank für Ihre Rückmeldung!" })).toBeInTheDocument();
    expect(screen.getByText(/ANG-2026-0042/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Angebot annehmen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Angebot ablehnen" })).not.toBeInTheDocument();
  });
});
