import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";

import { DocumentEditor } from "./DocumentEditor";
import { ConfirmProvider, ToastProvider } from "@/ui/FeedbackProvider";
import { InvoiceStatus } from "@/types";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";

const saveInvoiceMock = vi.fn();
const getInvoiceMock = vi.fn();
const sendDocumentEmailMock = vi.fn();


vi.mock("@/app/invoices/invoiceService", () => ({
  saveInvoice: (...args: unknown[]) => saveInvoiceMock(...args),
  getInvoice: (...args: unknown[]) => getInvoiceMock(...args),
}));

vi.mock("@/app/offers/offerService", () => ({
  saveOffer: vi.fn(),
}));

vi.mock("@/app/email/emailService", () => ({
  sendDocumentEmail: (...args: unknown[]) => sendDocumentEmailMock(...args),
}));

vi.mock("@/app/pdf/documentPdfService", () => ({
  downloadDocumentPdf: vi.fn(),
}));

const seed = {
  id: "inv-1",
  number: "RE-0001",
  date: "2025-01-01",
  paymentTermsDays: 14,
  dueDate: "2025-01-10",
  vatRate: 19,
  isSmallBusiness: false,
  smallBusinessNote: SMALL_BUSINESS_DEFAULT_NOTE,
  introText: "",
  footerText: "",
};

const settings = {
  name: "",
  companyName: "Acme GmbH",
  address: "",
  taxId: "",
  defaultVatRate: 19,
  defaultPaymentTerms: 14,
  iban: "",
  bic: "",
  bankName: "",
  email: "",
  emailDefaultSubject: "Dokument {nummer}",
  emailDefaultText: "Bitte im Anhang finden Sie das Dokument.",
  isSmallBusiness: false,
  smallBusinessNote: SMALL_BUSINESS_DEFAULT_NOTE,
  logoUrl: "",
  primaryColor: "#4f46e5",
  templateId: "default",
  locale: "de-DE",
  currency: "EUR",
  prefixInvoice: "RE",
  prefixOffer: "ANG",
  numberPadding: 4,
  footerText: "",
  defaultSenderIdentityId: "sender-1",
};

const clients = [
  {
    id: "client-1",
    companyName: "Client AG",
    contactPerson: "",
    email: "client@example.com",
    address: "",
    notes: "",
  },
];

describe("DocumentEditor send email status", () => {
  beforeEach(() => {
    saveInvoiceMock.mockReset();
    getInvoiceMock.mockReset();
    sendDocumentEmailMock.mockReset();
  });

  it("sets status SENT on successful send", async () => {
    sendDocumentEmailMock.mockResolvedValue({ ok: true });
    getInvoiceMock.mockResolvedValue({
      id: "inv-1",
      clientId: "client-1",
      positions: [],
      status: InvoiceStatus.SENT,
      paymentTermsDays: 14,
    });
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ConfirmProvider>
          <DocumentEditor
            type="invoice"
            seed={seed}
            settings={settings}
            clients={clients}
            onClose={vi.fn()}
            onSaved={vi.fn()}
            initial={{
              id: "inv-1",
              clientId: "client-1",
              positions: [],
              status: InvoiceStatus.DRAFT,
              paymentTermsDays: 14,
            }}
          />
        </ConfirmProvider>
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /per e-mail senden/i }));

    await waitFor(() => {
      expect(sendDocumentEmailMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getInvoiceMock).toHaveBeenCalled();
    });

  });

  it("keeps status unchanged on failed send", async () => {
    sendDocumentEmailMock.mockRejectedValue(new Error("fail"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ConfirmProvider>
          <DocumentEditor
            type="invoice"
            seed={seed}
            settings={settings}
            clients={clients}
            onClose={vi.fn()}
            onSaved={vi.fn()}
            initial={{
              id: "inv-1",
              clientId: "client-1",
              positions: [],
              status: InvoiceStatus.DRAFT,
            }}
          />
        </ConfirmProvider>
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /per e-mail senden/i }));

    await waitFor(() => {
      expect(sendDocumentEmailMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(saveInvoiceMock).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });


  it("is read-only when invoice is locked", async () => {
    render(
      <ToastProvider>
        <ConfirmProvider>
          <DocumentEditor
            type="invoice"
            seed={seed}
            settings={settings}
            clients={clients}
            onClose={vi.fn()}
            onSaved={vi.fn()}
            initial={{
              id: "inv-1",
              clientId: "client-1",
              positions: [],
              status: InvoiceStatus.DRAFT,
              isLocked: true,
            }}
          />
        </ConfirmProvider>
      </ToastProvider>
    );

    const numberInput = screen.getByLabelText("Nummer");
    expect(numberInput).toBeDisabled();
  });

  it("does not send when email is not configured", async () => {
    sendDocumentEmailMock.mockResolvedValue({ ok: false, code: "EMAIL_NOT_CONFIGURED" });
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ConfirmProvider>
          <DocumentEditor
            type="invoice"
            seed={seed}
            settings={settings}
            clients={clients}
            onClose={vi.fn()}
            onSaved={vi.fn()}
            initial={{
              id: "inv-1",
              clientId: "client-1",
              positions: [],
              status: InvoiceStatus.DRAFT,
            }}
          />
        </ConfirmProvider>
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /per e-mail senden/i }));

    await waitFor(() => {
      expect(sendDocumentEmailMock).toHaveBeenCalled();
    });

    expect(saveInvoiceMock).not.toHaveBeenCalled();
  });
});
