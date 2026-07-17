import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";

import { renderWithProviders } from "@/test/renderWithProviders";
import InvoiceEditPage from "./InvoiceEditPage";
import OfferEditPage from "./OfferEditPage";

vi.mock("@/features/documents/DocumentEditor", () => ({
  DocumentEditor: ({ type, layout, useCreateComposer, composerEditing }: { type: string; layout: string; useCreateComposer: boolean; composerEditing: boolean }) => (
    <div data-testid={`editor-${type}`} data-layout={layout} data-composer={String(useCreateComposer)} data-editing={String(composerEditing)} />
  ),
}));

vi.mock("@/app/clients/clientService", () => ({ list: vi.fn().mockResolvedValue([]) }));
vi.mock("@/app/settings/settingsService", () => ({ fetchSettings: vi.fn().mockResolvedValue({ currency: "EUR", locale: "de-DE" }) }));
vi.mock("@/app/invoices/invoiceService", () => ({
  getInvoice: vi.fn().mockResolvedValue({ id: "inv-1", number: null, clientId: "c-1", date: "2026-07-17", serviceDate: "2026-07-17", paymentTermsDays: 14, positions: [], vatRate: 19, isSmallBusiness: false, introText: "", footerText: "", status: "DRAFT", currency: "EUR" }),
}));
vi.mock("@/app/offers/offerService", () => ({
  getOffer: vi.fn().mockResolvedValue({ id: "off-1", number: "ANG-1", clientId: "c-1", date: "2026-07-17", validUntil: "2026-07-31", positions: [], vatRate: 19, introText: "", footerText: "", status: "DRAFT", currency: "EUR" }),
}));

describe("dedicated document edit pages", () => {
  it("renders invoice editing as a standalone page composer", async () => {
    renderWithProviders(<Routes><Route path="/app/documents/invoice/:id/edit" element={<InvoiceEditPage />} /></Routes>, { route: "/app/documents/invoice/inv-1/edit" });
    const editor = await screen.findByTestId("editor-invoice");
    expect(editor).toHaveAttribute("data-layout", "page");
    expect(editor).toHaveAttribute("data-editing", "true");
  });

  it("renders offer editing as a standalone page composer", async () => {
    renderWithProviders(<Routes><Route path="/app/documents/offer/:id/edit" element={<OfferEditPage />} /></Routes>, { route: "/app/documents/offer/off-1/edit" });
    const editor = await screen.findByTestId("editor-offer");
    expect(editor).toHaveAttribute("data-layout", "page");
    expect(editor).toHaveAttribute("data-editing", "true");
  });
});
