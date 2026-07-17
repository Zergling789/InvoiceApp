import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecipientDocumentPage, { formatRecipientDate } from "./RecipientDocumentPage";
import { renderWithProviders } from "@/test/renderWithProviders";

const loadMock = vi.fn();
const respondMock = vi.fn();

vi.mock("@/app/recipient/recipientService", () => ({ loadRecipientDocument: (...args: unknown[]) => loadMock(...args), respondToOffer: (...args: unknown[]) => respondMock(...args) }));

const recipientData = { type: "offer" as const, doc: { number: "ANG-1", date: "2026-07-17", validUntil: "2026-07-31", positions: [{ id: "p-1", description: "Montage", quantity: 2, unit: "Std", price: 50 }], vatRate: 19 }, client: { companyName: "Kunde GmbH" }, settings: { companyName: "Musterbetrieb", currency: "EUR" }, response: null, responseReason: null, expiresAt: "2026-08-31T00:00:00Z" };

const renderPage = () => renderWithProviders(<Routes><Route path="/recipient/:token" element={<RecipientDocumentPage />} /></Routes>, { route: "/recipient/test-token" });

describe("RecipientDocumentPage", () => {
  beforeEach(() => { loadMock.mockReset(); respondMock.mockReset(); loadMock.mockResolvedValue(recipientData); });

  it("formats document dates for German recipients", () => {
    expect(formatRecipientDate("2026-07-17")).toBe("17.7.2026");
  });

  it("recovers from a failed initial load", async () => {
    const user = userEvent.setup();
    loadMock.mockRejectedValueOnce(new Error("technical")).mockResolvedValueOnce(recipientData);
    renderPage();
    expect(await screen.findByText("Dokument nicht erreichbar")).toBeInTheDocument();
    expect(screen.queryByText("technical")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByRole("heading", { name: "Ihr Angebot von Musterbetrieb" })).toBeInTheDocument();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("shows a rejection distinctly and prevents another response", async () => {
    loadMock.mockResolvedValue({ ...recipientData, response: "REJECTED", responseReason: "Termin passt nicht." });
    renderPage();
    expect(await screen.findByText("Antwort gespeichert: Abgelehnt")).toBeInTheDocument();
    expect(screen.getByText(/Termin passt nicht/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Angebot annehmen" })).not.toBeInTheDocument());
  });
});
