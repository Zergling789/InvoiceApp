import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DocumentsHubPage from "./DocumentsHubPage";
import { renderWithProviders } from "@/test/renderWithProviders";
import { OfferStatus } from "@/types";

const listClientsMock = vi.fn();
const listOffersPageMock = vi.fn();
const listInvoicesPageMock = vi.fn();

vi.mock("@/app/clients/clientService", () => ({
  listSummaries: () => listClientsMock(),
}));

vi.mock("@/app/offers/offerService", () => ({
  listOffersPage: (options: unknown) => listOffersPageMock(options),
}));

vi.mock("@/app/invoices/invoiceService", () => ({
  listInvoicesPage: (options: unknown) => listInvoicesPageMock(options),
}));

vi.mock("@/app/settings/settingsService", () => ({
  fetchSettings: vi.fn(async () => ({ locale: "de-DE", currency: "EUR" })),
}));

describe("DocumentsHubPage table view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    listOffersPageMock.mockResolvedValue({
      items: [
        {
          id: "offer-1",
          createdAt: "2026-07-16T10:00:00.000Z",
          number: "ANG-0154",
          clientId: "client-1",
          date: "2026-07-16",
          validUntil: "2026-07-30",
          positions: [{ id: "p1", description: "Beratung", quantity: 1, unit: "Std", price: 100 }],
          vatRate: 19,
          currency: "EUR",
          status: OfferStatus.DRAFT,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    listInvoicesPageMock.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
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

  it("shows one retry state instead of an empty document list after a load failure", async () => {
    listClientsMock.mockRejectedValue(new Error("private database detail"));
    renderWithProviders(<DocumentsHubPage />, { route: "/app/documents" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Dokumente konnten nicht geladen werden");
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    expect(screen.queryByText("Keine Dokumente gefunden.")).not.toBeInTheDocument();

    const callsBeforeRetry = listClientsMock.mock.calls.length;
    listClientsMock.mockResolvedValue([
      {
        id: "client-1",
        companyName: "Beispiel GmbH",
        firstName: "Fabian",
        lastName: "Heimlich",
        contactPerson: "Fabian Heimlich",
      },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await waitFor(() => expect(listClientsMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry));
    expect(await screen.findByRole("row", { name: /ANG-0154.*Fabian.*Heimlich/i })).toBeVisible();
  });

  it("loads the next cursor page without replacing documents already shown", async () => {
    listOffersPageMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "offer-1",
            createdAt: "2026-07-16T10:00:00.000Z",
            number: "ANG-0154",
            clientId: "client-1",
            date: "2026-07-16",
            validUntil: "2026-07-30",
            positions: [],
            vatRate: 19,
            currency: "EUR",
            status: OfferStatus.DRAFT,
          },
        ],
        nextCursor: { createdAt: "2026-07-16T10:00:00.000Z", id: "offer-1" },
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "offer-2",
            createdAt: "2026-07-15T10:00:00.000Z",
            number: "ANG-0153",
            clientId: "client-1",
            date: "2026-07-15",
            validUntil: "2026-07-29",
            positions: [],
            vatRate: 19,
            currency: "EUR",
            status: OfferStatus.DRAFT,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

    renderWithProviders(<DocumentsHubPage />, { route: "/app/documents" });

    expect((await screen.findAllByText("ANG-0154"))[0]).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Weitere Dokumente laden" }));

    expect((await screen.findAllByText("ANG-0153"))[0]).toBeVisible();
    expect(screen.getAllByText("ANG-0154")[0]).toBeVisible();
    expect(listOffersPageMock).toHaveBeenLastCalledWith({
      cursor: { createdAt: "2026-07-16T10:00:00.000Z", id: "offer-1" },
      pageSize: 24,
    });
  });

  it("passes search to the first server-filtered page", async () => {
    listOffersPageMock
      .mockResolvedValueOnce({
        items: [
          {
            id: "offer-1",
            createdAt: "2026-07-16T10:00:00.000Z",
            number: "ANG-0154",
            clientId: "client-1",
            date: "2026-07-16",
            validUntil: "2026-07-30",
            positions: [],
            vatRate: 19,
            currency: "EUR",
            status: OfferStatus.DRAFT,
          },
        ],
        nextCursor: { createdAt: "2026-07-16T10:00:00.000Z", id: "offer-1" },
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "offer-2",
            createdAt: "2026-07-15T10:00:00.000Z",
            number: "ANG-0999",
            clientId: "client-1",
            date: "2026-07-15",
            validUntil: "2026-07-29",
            positions: [],
            vatRate: 19,
            currency: "EUR",
            status: OfferStatus.DRAFT,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

    renderWithProviders(<DocumentsHubPage />, { route: "/app/documents" });
    await screen.findAllByText("ANG-0154");

    fireEvent.change(screen.getByPlaceholderText("Suche nach Nummer oder Kunde"), {
      target: { value: "Beispiel" },
    });

    expect((await screen.findAllByText("ANG-0999"))[0]).toBeVisible();
    expect(screen.queryByText("ANG-0154")).not.toBeInTheDocument();
    expect(listOffersPageMock).toHaveBeenLastCalledWith({
      pageSize: 24,
      search: "Beispiel",
    });
  });

  it("filters offer phases on the server without requesting unrelated invoices", async () => {
    renderWithProviders(<DocumentsHubPage />, { route: "/app/documents" });
    await screen.findAllByText("ANG-0154");
    const invoiceCallsBeforeFilter = listInvoicesPageMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Angenommen" }));

    await waitFor(() =>
      expect(listOffersPageMock).toHaveBeenLastCalledWith({
        pageSize: 24,
        phases: ["accepted"],
      }),
    );
    expect(listInvoicesPageMock).toHaveBeenCalledTimes(invoiceCallsBeforeFilter);
  });
});
