import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";

import { DocumentEditor } from "./DocumentEditor";
import { renderWithProviders } from "@/test/renderWithProviders";
import { InvoiceStatus, OfferStatus } from "@/types";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";

const saveInvoiceMock = vi.fn();
const getInvoiceMock = vi.fn();
const sendDocumentEmailMock = vi.fn();
const createAiDocumentDraftMock = vi.fn();
const saveOfferMock = vi.fn();

vi.mock("@/app/invoices/invoiceService", () => ({
  saveInvoice: (...args: unknown[]) => saveInvoiceMock(...args),
  getInvoice: (...args: unknown[]) => getInvoiceMock(...args),
  listInvoices: vi.fn().mockResolvedValue([]),
  buildDueDate: (startIso: string, days: number) => {
    const due = new Date(new Date(startIso).getTime() + days * 86_400_000);
    return due.toISOString().slice(0, 10);
  },
}));

vi.mock("@/app/offers/offerService", () => ({
  saveOffer: (...args: unknown[]) => saveOfferMock(...args),
}));

vi.mock("@/app/email/emailService", () => ({
  sendDocumentEmail: (...args: unknown[]) => sendDocumentEmailMock(...args),
}));

vi.mock("@/app/pdf/documentPdfService", () => ({
  downloadDocumentPdf: vi.fn(),
}));

vi.mock("@/app/ai/aiService", () => ({
  createAiDocumentDraft: (...args: unknown[]) =>
    createAiDocumentDraftMock(...args),
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
    createAiDocumentDraftMock.mockReset();
    saveOfferMock.mockReset();
    saveOfferMock.mockResolvedValue(undefined);
  });

  it.each(["offer", "invoice"] as const)(
    "selects a newly created customer when returning to the %s wizard",
    async (type) => {
      renderWithProviders(
        <DocumentEditor
          type={type}
          seed={type === "offer" ? { ...seed, validUntil: "2025-01-15" } : seed}
          settings={settings}
          clients={clients}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          useCreateComposer
        />,
        { route: `/app/${type === "offer" ? "offers" : "invoices"}/new?step=kunde&clientId=client-1` },
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Kunde auswählen")).toHaveValue("client-1");
      });
      expect(screen.getAllByText("Client AG").length).toBeGreaterThan(1);
    },
  );

  it("appends an accepted AI draft and preserves existing content", async () => {
    createAiDocumentDraftMock.mockResolvedValue({
      positions: [
        { description: "Hosting", quantity: 12, unit: "Monat", price: 15 },
      ],
      introText: "Neue Einleitung",
      footerText: "Neuer Fußtext",
      warnings: [],
    });
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentEditor
        type="invoice"
        seed={seed}
        settings={settings}
        clients={clients}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        useCreateComposer
        composerEditing
        initial={{
          clientId: "client-1",
          positions: [
            {
              id: "existing",
              description: "Beratung",
              quantity: 1,
              unit: "Std",
              price: 100,
            },
          ],
          introText: "Bestehende Einleitung",
          footerText: "Bestehender Fußtext",
          status: InvoiceStatus.DRAFT,
        }}
      />,
      { route: "/app/invoices/inv-1/edit" },
    );

    await user.click(screen.getByRole("button", { name: /mit ki erstellen/i }));
    await user.type(
      screen.getByLabelText(/leistungen beschreiben/i),
      "Hosting für zwölf Monate",
    );
    await user.click(
      screen.getByRole("button", { name: /vorschlag erstellen/i }),
    );
    await screen.findByLabelText("KI-Vorschau");
    await user.click(screen.getByRole("button", { name: /^übernehmen$/i }));

    expect(screen.getByDisplayValue("Beratung")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hosting")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Bestehende Einleitung"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Bestehender Fußtext")).toBeInTheDocument();
    expect(saveInvoiceMock).not.toHaveBeenCalled();
  });

  it("opens the AI dialog from the offer creation wizard", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentEditor
        type="offer"
        seed={{ ...seed, id: "offer-1", number: "ANG-0001" }}
        settings={settings}
        clients={clients}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        useCreateComposer
        initial={{
          clientId: "client-1",
          positions: [],
          status: OfferStatus.DRAFT,
          validUntil: "2025-01-31",
          currency: "EUR",
        }}
      />,
      { route: "/app/offers/new?step=positionen" },
    );

    await user.click(screen.getByRole("button", { name: /mit ki erstellen/i }));

    expect(
      await screen.findByRole("dialog", { name: /dokument mit ki erstellen/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/leistungen beschreiben/i)).toBeEnabled();
  });

  it("führt schrittweise durch die Angebotserstellung und erhält Eingaben", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentEditor
        type="offer"
        seed={{ ...seed, id: "offer-wizard", number: "ANG-0001" }}
        settings={settings}
        clients={clients}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        useCreateComposer
        initial={{
          clientId: "",
          positions: [],
          status: OfferStatus.DRAFT,
          validUntil: "2025-01-31",
          currency: "EUR",
        }}
      />,
      { route: "/app/offers/new" },
    );

    expect(screen.getByRole("button", { name: /1 Kunde/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.queryByLabelText("Angebotsnummer")).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Kunde auswählen"),
      "client-1",
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Dokumentdaten" }),
    );
    const number = screen.getByLabelText("Angebotsnummer");
    await user.clear(number);
    await user.type(number, "ANG-0099");
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    await user.click(screen.getByRole("button", { name: /2 Dokumentdaten/ }));
    expect(screen.getByLabelText("Angebotsnummer")).toHaveValue("ANG-0099");
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Positionen" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Texte und Optionen" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "mindestens eine vollständig ausgefüllte Position",
    );
    expect(
      screen.queryByText("Texte & Optionen", { selector: ".font-semibold" }),
    ).not.toBeInTheDocument();
  });

  it("zeigt die finale Erstellung ausschließlich in der Vorschau und speichert nur einmal", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentEditor
        type="offer"
        seed={{ ...seed, id: "offer-final", number: "ANG-0010" }}
        settings={settings}
        clients={clients}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        useCreateComposer
        initial={{
          clientId: "client-1",
          positions: [
            {
              id: "p1",
              description: "Beratung",
              quantity: 1,
              unit: "Std",
              price: 100,
              taxCategory: "STANDARD",
              taxRate: 19,
            },
          ],
          status: OfferStatus.DRAFT,
          validUntil: "2025-01-31",
          currency: "EUR",
        }}
      />,
      { route: "/app/offers/new" },
    );

    expect(
      screen.queryByRole("button", { name: /^Angebot erstellen$/ }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Dokumentdaten" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Positionen" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Texte und Optionen" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter zur Vorschau" }),
    );
    expect(screen.getByText("Vorschau & Abschluss")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /^Angebot erstellen$/ }),
    );
    await waitFor(() => expect(saveOfferMock).toHaveBeenCalledTimes(1));
  });

  it("führt neue Rechnungen durch denselben fünfstufigen Erstellungsablauf", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentEditor
        type="invoice"
        seed={seed}
        settings={settings}
        clients={clients}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        useCreateComposer
        initial={{
          clientId: "client-1",
          positions: [
            {
              id: "invoice-position",
              description: "Beratung",
              quantity: 1,
              unit: "Std",
              price: 100,
              taxCategory: "STANDARD",
              taxRate: 19,
            },
          ],
          status: InvoiceStatus.DRAFT,
        }}
      />,
      { route: "/app/invoices/new" },
    );

    expect(
      screen.getByRole("heading", { name: /rechnung erstellen/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", {
        name: /fortschritt rechnungserstellung/i,
      }),
    ).toBeVisible();
    expect(screen.getByText("Schritt 1 von 5")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Fortschritt" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByRole("button", { name: /1 Kunde/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.queryByLabelText("Rechnungsnummer")).not.toBeInTheDocument();
    expect(screen.getByText("Zusammenfassung")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Weiter zu Dokumentdaten" }),
    );
    expect(screen.getByLabelText("Rechnungsnummer")).toBeDisabled();
    expect(screen.getByLabelText("Leistungsdatum")).toHaveValue("2025-01-01");
    const currencySelect = screen.getByLabelText("Währung") as HTMLSelectElement;
    expect(Array.from(currencySelect.options, (option) => option.value)).toEqual(["EUR"]);
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Positionen" }),
    );
    expect(screen.getByText("Schritt 3 von 5")).toBeVisible();
    expect(screen.getByText("Leistung oder Produkt")).toBeVisible();
    expect(screen.getByText("Menge")).toBeVisible();
    expect(screen.getByText("Einheit")).toBeVisible();
    expect(screen.getByText("Einzelpreis")).toBeVisible();
    expect(screen.getByRole("button", { name: "Paket einfügen" })).toBeVisible();
    const taxSelect = screen.getByLabelText("Steuerart 1") as HTMLSelectElement;
    expect(Array.from(taxSelect.options, (option) => option.value)).toEqual([
      "STANDARD",
      "REDUCED",
    ]);
    await user.click(
      screen.getByRole("button", { name: "Weiter zu Texte und Optionen" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Weiter zur Vorschau" }),
    );

    expect(screen.getByText("Vorschau & Abschluss")).toBeVisible();
    expect(screen.getAllByText("RE-0001")).not.toHaveLength(0);
    expect(
      screen.getByRole("button", { name: /^Rechnung erstellen$/ }),
    ).toBeEnabled();
  });

  it("bewahrt alte Sondersteuerfälle, bietet sie aber nicht für neue Positionen an", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DocumentEditor
        type="invoice"
        seed={seed}
        settings={settings}
        clients={clients}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        useCreateComposer
        initial={{
          clientId: "client-1",
          positions: [
            {
              id: "legacy-tax-position",
              description: "Alte Leistung",
              quantity: 1,
              unit: "Std",
              price: 100,
              taxCategory: "REVERSE_CHARGE",
              taxRate: 0,
            },
          ],
          status: InvoiceStatus.DRAFT,
          currency: "USD",
        }}
      />,
      { route: "/app/invoices/new" },
    );

    await user.click(screen.getByRole("button", { name: "Weiter zu Dokumentdaten" }));
    const currencySelect = screen.getByLabelText("Währung") as HTMLSelectElement;
    expect(Array.from(currencySelect.options, (option) => option.value)).toEqual(["USD", "EUR"]);
    expect(currencySelect.options[0]).toBeDisabled();
    expect(screen.getByText(/Fremdwährungen werden derzeit nicht unterstützt/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Weiter zu Positionen" }));

    const taxSelect = screen.getByLabelText("Steuerart 1") as HTMLSelectElement;
    expect(Array.from(taxSelect.options, (option) => option.value)).toEqual([
      "REVERSE_CHARGE",
      "STANDARD",
      "REDUCED",
    ]);
    expect(taxSelect.options[0]).toBeDisabled();
    expect(screen.getByText(/Dieser Steuerfall kann derzeit nicht ausgestellt werden/)).toBeVisible();
  });

  it("sets status SENT on successful send", async () => {
    sendDocumentEmailMock.mockResolvedValue({ ok: true });
    getInvoiceMock.mockResolvedValue({
      id: "inv-1",
      number: "RE-0001",
      clientId: "client-1",
      clientName: "Client AG",
      clientEmail: "client@example.com",
      date: "2025-01-01",
      positions: [],
      vatRate: 19,
      isSmallBusiness: false,
      introText: "",
      footerText: "",
      status: InvoiceStatus.SENT,
      paymentTermsDays: 14,
    });
    const user = userEvent.setup();

    renderWithProviders(
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
          status: InvoiceStatus.ISSUED,
          paymentTermsDays: 14,
        }}
      />,
      { route: "/app/invoices/inv-1" },
    );

    await user.click(screen.getByRole("button", { name: /mehr optionen/i }));
    await user.click(
      screen.getByRole("button", { name: /per e-mail senden/i }),
    );
    await user.type(
      screen.getByPlaceholderText("to@example.com"),
      "client@example.com",
    );
    await user.click(screen.getByRole("button", { name: /^senden$/i }));

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

    renderWithProviders(
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
          status: InvoiceStatus.ISSUED,
        }}
      />,
      { route: "/app/invoices/inv-1" },
    );

    await user.click(screen.getByRole("button", { name: /mehr optionen/i }));
    await user.click(
      screen.getByRole("button", { name: /per e-mail senden/i }),
    );
    await user.type(
      screen.getByPlaceholderText("to@example.com"),
      "client@example.com",
    );
    await user.click(screen.getByRole("button", { name: /^senden$/i }));

    await waitFor(() => {
      expect(sendDocumentEmailMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(saveInvoiceMock).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("is read-only when invoice is locked", async () => {
    renderWithProviders(
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
          status: InvoiceStatus.ISSUED,
          isLocked: true,
        }}
      />,
      { route: "/app/invoices/inv-1" },
    );

    const numberInput = screen.getByLabelText("Nummer");
    expect(numberInput).toBeDisabled();
  });

  it("does not send when email is not configured", async () => {
    sendDocumentEmailMock.mockResolvedValue({
      ok: false,
      code: "EMAIL_NOT_CONFIGURED",
    });
    const user = userEvent.setup();

    renderWithProviders(
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
          status: InvoiceStatus.ISSUED,
        }}
      />,
      { route: "/app/invoices/inv-1" },
    );

    await user.click(screen.getByRole("button", { name: /mehr optionen/i }));
    await user.click(
      screen.getByRole("button", { name: /per e-mail senden/i }),
    );
    await user.type(
      screen.getByPlaceholderText("to@example.com"),
      "client@example.com",
    );
    await user.click(screen.getByRole("button", { name: /^senden$/i }));

    await waitFor(() => {
      expect(sendDocumentEmailMock).toHaveBeenCalled();
    });

    expect(saveInvoiceMock).not.toHaveBeenCalled();
  });
});
