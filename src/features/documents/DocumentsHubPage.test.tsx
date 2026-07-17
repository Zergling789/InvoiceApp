import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DocumentsHubPage from "./DocumentsHubPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { OfferStatus } from "@/types";

const listClientsMock = vi.fn();
const listOffersMock = vi.fn();
const listInvoicesMock = vi.fn();

vi.mock("@/app/clients/clientService", () => ({
  list: () => listClientsMock(),
}));

vi.mock("@/app/offers/offerService", () => ({
  listOffers: () => listOffersMock(),
}));

vi.mock("@/app/invoices/invoiceService", () => ({
  listInvoices: () => listInvoicesMock(),
}));

vi.mock("@/app/settings/settingsService", () => ({
  fetchSettings: vi.fn(async () => ({ locale: "de-DE", currency: "EUR" })),
}));

describe("DocumentsHubPage table view", () => {
  beforeEach(() => {
    listClientsMock.mockResolvedValue([
      {
        id: "client-1",
        companyName: "Beispiel GmbH",
        firstName: "Fabian",
        lastName: "Heimlich",
        contactPerson: "Fabian Heimlich",
        email: "",
        address: "",
        notes: "",
      },
    ]);
    listOffersMock.mockResolvedValue([
      {
        id: "offer-1",
        number: "ANG-0154",
        clientId: "client-1",
        date: "2026-07-16",
        validUntil: "2026-07-30",
        positions: [{ id: "p1", description: "Beratung", quantity: 1, unit: "Std", price: 100 }],
        vatRate: 19,
        currency: "EUR",
        status: OfferStatus.DRAFT,
      },
    ]);
    listInvoicesMock.mockResolvedValue([]);
  });

  it("shows separate document, person, company, amount and status columns", async () => {
    renderWithProviders(<DocumentsHubPage />, { route: "/app/documents" });

    expect(await screen.findByRole("columnheader", { name: "Dokument" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Vorname" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Nachname" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Firma" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Betrag" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeVisible();

    const row = screen.getByRole("row", { name: /ANG-0154.*Fabian.*Heimlich.*Beispiel GmbH/i });
    expect(row).toHaveTextContent("119,00 €");
    expect(row).toHaveTextContent("Entwurf");
  });

  it("briefly highlights a newly created document after returning to the overview", async () => {
    renderWithProviders(<DocumentsHubPage />, {
      route: "/app/documents",
      routeState: {
        refreshDocuments: 123,
        highlightDocument: { id: "offer-1", type: "offer" },
      },
    });

    const row = await screen.findByRole("row", { name: /ANG-0154.*Fabian.*Heimlich.*Beispiel GmbH/i });
    expect(row).toHaveClass("document-created-highlight");
    expect(row).toHaveAttribute("data-document-key", "offer-offer-1");
  });
});
