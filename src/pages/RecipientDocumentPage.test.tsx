import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecipientDocumentPage from "@/pages/RecipientDocumentPage";
import { renderWithProviders } from "@/test/renderWithProviders";

const loadRecipientDocument = vi.fn();

vi.mock("@/app/recipient/recipientService", () => ({
  loadRecipientDocument: (token: string) => loadRecipientDocument(token),
  respondToOffer: vi.fn(),
}));

describe("RecipientDocumentPage", () => {
  beforeEach(() => {
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
      expiresAt: "2026-08-14T00:00:00.000Z",
    });
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
});
