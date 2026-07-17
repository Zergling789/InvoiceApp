import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InvoiceForm } from "@/features/documents/create/InvoiceForm";
import { OfferForm } from "@/features/documents/create/OfferForm";

const listClientsMock = vi.fn();
const fetchSettingsMock = vi.fn();

vi.mock("@/app/clients/clientService", () => ({ list: () => listClientsMock() }));
vi.mock("@/app/settings/settingsService", () => ({ fetchSettings: () => fetchSettingsMock() }));
vi.mock("@/app/numbering/numberingService", () => ({ getNextDocumentNumber: vi.fn(async () => "ANG-1") }));
vi.mock("@/app/invoices/invoiceService", () => ({ buildDueDate: vi.fn(() => "2026-07-31") }));
vi.mock("@/features/documents/DocumentEditor", () => ({
  DocumentEditor: ({ type }: { type: string }) => <div data-testid={`editor-${type}`} />,
}));

describe("document form loading recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listClientsMock.mockResolvedValue([]);
    fetchSettingsMock.mockResolvedValue({
      defaultPaymentTerms: 14,
      defaultVatRate: 19,
      isSmallBusiness: false,
    });
  });

  it.each([
    ["offer", OfferForm, "Angebotserstellung konnte nicht geladen werden"],
    ["invoice", InvoiceForm, "Rechnungserstellung konnte nicht geladen werden"],
  ] as const)("retries the %s form bootstrap", async (type, Form, title) => {
    listClientsMock.mockRejectedValueOnce(new Error("private database detail"));
    render(<Form onClose={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(title);
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    await waitFor(() => expect(listClientsMock.mock.calls.length).toBeGreaterThan(1));
    expect(await screen.findByTestId(`editor-${type}`)).toBeVisible();
  });
});
