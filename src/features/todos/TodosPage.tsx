import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { Client, Invoice, Offer, UserSettings } from "@/types";
import { loadDashboardData } from "@/app/dashboard/dashboardService";
import { fetchSettings } from "@/app/settings/settingsService";
import {
  calculateDocumentTotal,
  formatCurrencyEur,
  getDaysSince,
  getInvoiceReferenceDate,
  getOfferReferenceDate,
  type OfferWithFollowUp,
} from "@/utils/dashboard";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { SendDocumentModal } from "@/features/documents/SendDocumentModal";
import { mapErrorCodeToToast } from "@/utils/errorMapping";
import * as invoiceService from "@/app/invoices/invoiceService";
import { getNextDocumentNumber } from "@/app/numbering/numberingService";
import { DocumentEditor, type EditorSeed } from "@/features/documents/DocumentEditor";
import {
  getDocumentCapabilities,
  getInvoicePhase,
  getOfferPhase,
} from "@/features/documents/state/documentState";
import {
  formatInvoicePhaseLabel,
  formatOfferPhaseLabel,
} from "@/features/documents/state/formatPhaseLabel";

type DashboardData = {
  clients: Client[];
  offers: Offer[];
  invoices: Invoice[];
};

type TodoCard = {
  id: string;
  type: "invoice" | "offer";
  number: string;
  clientName: string;
  amountLabel: string;
  statusLabel: string;
  statusTone: "gray" | "yellow" | "red" | "blue";
  ageLabel: string;
  secondaryAction?: {
    label: string;
    intent: "reminder" | "dunning" | "followup" | "edit";
  };
};

type FilterType = "all" | "invoices" | "offers";

const DAY_MS = 86400000;

const daysUntil = (dateStr?: string | null, today = new Date()) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.ceil((date.getTime() - today.getTime()) / DAY_MS));
};

const toLocalISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => toLocalISODate(new Date());
const addDaysISO = (days: number) => toLocalISODate(new Date(Date.now() + days * 86400000));

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export default function TodosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ clients: [], offers: [], invoices: [] });
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendIntent, setSendIntent] = useState<"reminder" | "dunning" | "followup" | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Invoice | Offer | null>(null);
  const [selectedType, setSelectedType] = useState<"invoice" | "offer" | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
  const [editorType, setEditorType] = useState<"invoice" | "offer">("invoice");
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextData, settingsData] = await Promise.all([loadDashboardData(), fetchSettings()]);
        if (mounted) {
          setData(nextData);
          setSettings(settingsData);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    data.clients.forEach((client) => map.set(client.id, client.companyName));
    return map;
  }, [data.clients]);

  const showInvoices = filter !== "offers";
  const showOffers = filter !== "invoices";
  const today = useMemo(() => new Date(), []);

  const overdueInvoices = useMemo(
    () =>
      showInvoices
        ? data.invoices.filter((invoice) => getInvoicePhase(invoice, today) === "overdue")
        : [],
    [data.invoices, showInvoices, today]
  );

  const openInvoices = useMemo(
    () =>
      showInvoices
        ? data.invoices.filter((invoice) => {
            const phase = getInvoicePhase(invoice, today);
            return phase === "issued" || phase === "sent";
          })
        : [],
    [data.invoices, showInvoices, today]
  );

  const followUpOffers = useMemo(
    () =>
      showOffers
        ? data.offers.filter((offer) => getOfferPhase(offer) === "sent")
        : [],
    [data.offers, showOffers]
  );

  const draftItems = useMemo(() => {
    const items: Array<{ type: "invoice" | "offer"; data: Invoice | Offer }> = [];
    if (showInvoices) {
      data.invoices.forEach((invoice) => {
        const isIncomplete =
          getInvoicePhase(invoice, today) === "draft" &&
          ((invoice.positions ?? []).length === 0 ||
            !invoice.clientId ||
            (!invoice.isSmallBusiness && invoice.vatRate == null));
        if (isIncomplete) items.push({ type: "invoice", data: invoice });
      });
    }
    if (showOffers) {
      data.offers.forEach((offer) => {
        const isIncomplete =
          getOfferPhase(offer) === "draft" &&
          ((offer.positions ?? []).length === 0 || !offer.clientId || offer.vatRate == null);
        if (isIncomplete) items.push({ type: "offer", data: offer });
      });
    }
    return items;
  }, [data.invoices, data.offers, showInvoices, showOffers, today]);

  const buildInvoiceCard = (
    invoice: Invoice,
    options: {
      statusLabel: string;
      tone: TodoCard["statusTone"];
      ageLabel: string;
      secondaryAction?: TodoCard["secondaryAction"];
    }
  ) => {
    const total = calculateDocumentTotal(
      invoice.positions ?? [],
      Number(invoice.vatRate ?? 0),
      invoice.isSmallBusiness
    );
    return {
      id: invoice.id,
      type: "invoice" as const,
      number: invoice.number ?? "Entwurf",
      clientName: clientNameById.get(invoice.clientId) ?? "Unbekannter Kunde",
      amountLabel: formatCurrencyEur(total),
      statusLabel: options.statusLabel,
      statusTone: options.tone,
      ageLabel: options.ageLabel,
      secondaryAction: options.secondaryAction,
    };
  };

  const buildOfferCard = (
    offer: Offer,
    options: {
      statusLabel: string;
      tone: TodoCard["statusTone"];
      ageLabel: string;
      secondaryAction?: TodoCard["secondaryAction"];
    }
  ) => {
    const total = calculateDocumentTotal(offer.positions ?? [], Number(offer.vatRate ?? 0));
    return {
      id: offer.id,
      type: "offer" as const,
      number: offer.number,
      clientName: clientNameById.get(offer.clientId) ?? "Unbekannter Kunde",
      amountLabel: formatCurrencyEur(total),
      statusLabel: options.statusLabel,
      statusTone: options.tone,
      ageLabel: options.ageLabel,
      secondaryAction: options.secondaryAction,
    };
  };

  const overdueInvoiceCards = overdueInvoices.map((invoice) =>
    buildInvoiceCard(invoice, (() => {
      const phase = getInvoicePhase(invoice, today);
      const capabilities = getDocumentCapabilities("invoice", invoice, today);
      return {
        statusLabel: formatInvoicePhaseLabel(phase),
        tone: "red",
        ageLabel: `seit ${getDaysSince(invoice.dueDate ?? invoice.date, today)} Tagen`,
        secondaryAction: capabilities.canSendDunning ? { label: "Mahnung senden", intent: "dunning" } : undefined,
      };
    })())
  );

  const openInvoiceCards = openInvoices.map((invoice) => {
    const dueLabel = invoice.dueDate
      ? `fällig in ${daysUntil(invoice.dueDate, today)} Tagen`
      : `seit ${getDaysSince(getInvoiceReferenceDate(invoice), today)} Tagen`;
    const phase = getInvoicePhase(invoice, today);
    const capabilities = getDocumentCapabilities("invoice", invoice, today);
    return buildInvoiceCard(invoice, {
      statusLabel: formatInvoicePhaseLabel(phase),
      tone: "yellow",
      ageLabel: dueLabel,
      secondaryAction: capabilities.canSendReminder ? { label: "Erinnerung senden", intent: "reminder" } : undefined,
    });
  });

  const followUpOfferCards = followUpOffers.map((offer) =>
    buildOfferCard(offer, (() => {
      const phase = getOfferPhase(offer);
      const capabilities = getDocumentCapabilities("offer", offer);
      return {
        statusLabel: formatOfferPhaseLabel(phase),
        tone: "blue",
        ageLabel: `seit ${getDaysSince(getOfferReferenceDate(offer as OfferWithFollowUp), today)} Tagen`,
        secondaryAction: capabilities.canSend ? { label: "Follow-up senden", intent: "followup" } : undefined,
      };
    })())
  );

  const draftCards = draftItems.map((item) => {
    if (item.type === "invoice") {
      const invoice = item.data as Invoice;
      const capabilities = getDocumentCapabilities("invoice", invoice, today);
      return buildInvoiceCard(invoice, {
        statusLabel: "Entwurf unvollständig",
        tone: "gray",
        ageLabel: `seit ${getDaysSince(invoice.date, today)} Tagen`,
        secondaryAction: capabilities.canEdit ? { label: "Vervollständigen", intent: "edit" } : undefined,
      });
    }
    const offer = item.data as Offer;
    const capabilities = getDocumentCapabilities("offer", offer);
    return buildOfferCard(offer, {
      statusLabel: "Entwurf unvollständig",
      tone: "gray",
      ageLabel: `seit ${getDaysSince(offer.date, today)} Tagen`,
      secondaryAction: capabilities.canEdit ? { label: "Vervollständigen", intent: "edit" } : undefined,
    });
  });

  const totalCards =
    overdueInvoiceCards.length +
    openInvoiceCards.length +
    followUpOfferCards.length +
    draftCards.length;

  const getDefaultSubject = (docType: "invoice" | "offer", docNumber: string | null) => {
    if (!settings) return "";
    const label = docType === "invoice" ? "Rechnung" : "Angebot";
    const template = settings.emailDefaultSubject?.trim() || `${label} {nummer}`;
    return template.replace("{nummer}", docNumber);
  };

  const getDefaultMessage = () => {
    if (!settings) return "";
    return settings.emailDefaultText?.trim() || "Bitte im Anhang finden Sie das Dokument.";
  };

  const handleFinalizeInvoice = async () => {
    if (!selectedDoc || selectedType !== "invoice") return null;
    const invoice = selectedDoc as Invoice;
    const capabilities = getDocumentCapabilities("invoice", invoice, today);
    if (!capabilities.canFinalize) return invoice;

    const ok = await confirm({
      title: "Rechnung finalisieren",
      message:
        "Nach dem Ausstellen sind Inhalt/Positionen gesperrt. Korrekturen nur per Gutschrift/Storno.",
    });
    if (!ok) return null;

    try {
      await invoiceService.finalizeInvoice(invoice.id);
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      toast.error(
        mapErrorCodeToToast(code ?? error.message) || "Rechnung konnte nicht finalisiert werden."
      );
      return null;
    }

    const updated = await invoiceService.getInvoice(invoice.id);
    if (!updated) {
      toast.error("Rechnung konnte nicht geladen werden.");
      return null;
    }

    setSelectedDoc(updated);
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((entry) => (entry.id === updated.id ? updated : entry)),
    }));
    return updated;
  };

  const handleSecondary = (card: TodoCard) => {
    if (!settings) {
      toast.error("E-Mail-Einstellungen fehlen.");
      return;
    }
    if (!card.secondaryAction) return;

    if (card.type === "invoice") {
      const invoice = data.invoices.find((entry) => entry.id === card.id);
      if (!invoice) return;
      if (card.secondaryAction.intent === "edit") {
        navigate(`/app/documents/invoice/${invoice.id}/edit`);
        return;
      }
      if (card.secondaryAction.intent === "reminder" || card.secondaryAction.intent === "dunning") {
        setSelectedDoc(invoice);
        setSelectedType("invoice");
        setSendIntent(card.secondaryAction.intent);
        setSendOpen(true);
        return;
      }
    }

    if (card.type === "offer") {
      const offer = data.offers.find((entry) => entry.id === card.id);
      if (!offer) return;
      if (card.secondaryAction.intent === "edit") {
        navigate(`/app/documents/offer/${offer.id}/edit`);
        return;
      }
      if (card.secondaryAction.intent === "followup") {
        setSelectedDoc(offer);
        setSelectedType("offer");
        setSendIntent("followup");
        setSendOpen(true);
        return;
      }
    }

    toast.info(`${card.secondaryAction.label} kommt als Nächstes.`);
  };

  const openNewEditor = async (type: "invoice" | "offer") => {
    if (type === "offer") {
      setFabOpen(false);
      navigate("/app/offers/new", { state: { backgroundLocation: location } });
      return;
    }
    try {
      const nextSettings = settings ?? (await fetchSettings());
      setSettings(nextSettings);
      const isInvoice = type === "invoice";
      const num = isInvoice ? null : await getNextDocumentNumber(type, nextSettings);
      const seed: EditorSeed = {
        id: newId(),
        number: num,
        date: todayISO(),
        dueDate: isInvoice
          ? invoiceService.buildDueDate(todayISO(), Number(nextSettings.defaultPaymentTerms ?? 14))
          : undefined,
        validUntil: !isInvoice ? addDaysISO(14) : undefined,
        vatRate: Number(nextSettings.defaultVatRate ?? 0),
        introText: isInvoice ? "" : "Gerne unterbreite ich Ihnen folgendes Angebot:",
        footerText: isInvoice
          ? `Zahlbar innerhalb von ${Number(nextSettings.defaultPaymentTerms ?? 14)} Tagen ohne Abzug.`
          : "Ich freue mich auf Ihre Rückmeldung.",
      };
      setEditorType(type);
      setEditorSeed(seed);
      setEditorOpen(true);
      setFabOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-6">
      {sendOpen && selectedDoc && selectedType && settings && (
        <SendDocumentModal
          isOpen={sendOpen}
          onClose={() => setSendOpen(false)}
          documentType={selectedType}
          document={selectedDoc}
          client={data.clients.find((entry) => entry.id === selectedDoc.clientId)}
          settings={settings}
          defaultSubject={getDefaultSubject(selectedType, selectedDoc.number ?? "")}
          defaultMessage={getDefaultMessage()}
          templateType={sendIntent ?? undefined}
          onFinalize={selectedType === "invoice" ? handleFinalizeInvoice : undefined}
          onSent={async (nextData) => {
            if (selectedType === "invoice") {
              const invoice = nextData as Invoice;
              setData((prev) => ({
                ...prev,
                invoices: prev.invoices.map((entry) => (entry.id === invoice.id ? invoice : entry)),
              }));
            } else {
              const offer = nextData as Offer;
              setData((prev) => ({
                ...prev,
                offers: prev.offers.map((entry) => (entry.id === offer.id ? offer : entry)),
              }));
            }
          }}
        />
      )}
      {editorOpen && editorSeed && settings && (
        <DocumentEditor
          type={editorType}
          seed={editorSeed}
          settings={settings}
          clients={data.clients}
          onClose={() => {
            setEditorOpen(false);
            setEditorSeed(null);
          }}
          onSaved={async () => {
            const nextData = await loadDashboardData();
            setData(nextData);
          }}
        />
      )}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">To-dos</h1>
        <p className="text-sm text-gray-600">Deine nächsten Schritte auf einen Blick.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AppButton
          variant={filter === "all" ? "primary" : "secondary"}
          onClick={() => setFilter("all")}
          className="min-w-[110px] justify-center"
        >
          Alle
        </AppButton>
        <AppButton
          variant={filter === "invoices" ? "primary" : "secondary"}
          onClick={() => setFilter("invoices")}
          className="min-w-[110px] justify-center"
        >
          Rechnungen
        </AppButton>
        <AppButton
          variant={filter === "offers" ? "primary" : "secondary"}
          onClick={() => setFilter("offers")}
          className="min-w-[110px] justify-center"
        >
          Angebote
        </AppButton>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {loading && (
        <AppCard>
          <div className="text-sm text-gray-500">Lade To-dos...</div>
        </AppCard>
      )}

      {!loading && totalCards === 0 && (
        <AppCard className="flex flex-col gap-4 items-start">
          <div className="text-sm text-gray-600">✅ Keine offenen To-dos</div>
          <div className="flex flex-wrap gap-3">
            <Link to="/app/offers/new" state={{ backgroundLocation: location }}>
              <AppButton>Neues Angebot</AppButton>
            </Link>
            <Link to="/app/documents?mode=invoices">
              <AppButton variant="secondary">Neue Rechnung</AppButton>
            </Link>
          </div>
        </AppCard>
      )}

      {!loading && overdueInvoiceCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Überfällige Rechnungen</h2>
            <span className="text-sm text-gray-500">{overdueInvoiceCards.length}</span>
          </div>
          <div className="space-y-3">
            {overdueInvoiceCards.map((card) => (
              <AppCard key={card.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Rechnung {card.number}</div>
                    <div className="text-base font-semibold text-gray-900">{card.clientName}</div>
                  </div>
                  <AppBadge color={card.statusTone}>{card.statusLabel}</AppBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{card.amountLabel}</span>
                  <span>•</span>
                  <span>{card.ageLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/documents/${card.type}/${card.id}`}>
                    <AppButton>Öffnen</AppButton>
                  </Link>
                  {card.secondaryAction && (
                    <AppButton variant="secondary" onClick={() => handleSecondary(card)}>
                      {card.secondaryAction.label}
                    </AppButton>
                  )}
                </div>
              </AppCard>
            ))}
          </div>
        </section>
      )}

      {!loading && openInvoiceCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Offene Rechnungen</h2>
            <span className="text-sm text-gray-500">{openInvoiceCards.length}</span>
          </div>
          <div className="space-y-3">
            {openInvoiceCards.map((card) => (
              <AppCard key={card.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Rechnung {card.number}</div>
                    <div className="text-base font-semibold text-gray-900">{card.clientName}</div>
                  </div>
                  <AppBadge color={card.statusTone}>{card.statusLabel}</AppBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{card.amountLabel}</span>
                  <span>•</span>
                  <span>{card.ageLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/documents/${card.type}/${card.id}`}>
                    <AppButton>Öffnen</AppButton>
                  </Link>
                  {card.secondaryAction && (
                    <AppButton variant="secondary" onClick={() => handleSecondary(card)}>
                      {card.secondaryAction.label}
                    </AppButton>
                  )}
                </div>
              </AppCard>
            ))}
          </div>
        </section>
      )}

      {!loading && followUpOfferCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Angebote ohne Antwort</h2>
            <span className="text-sm text-gray-500">{followUpOfferCards.length}</span>
          </div>
          <div className="space-y-3">
            {followUpOfferCards.map((card) => (
              <AppCard key={card.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">Angebot {card.number}</div>
                    <div className="text-base font-semibold text-gray-900">{card.clientName}</div>
                  </div>
                  <AppBadge color={card.statusTone}>{card.statusLabel}</AppBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{card.amountLabel}</span>
                  <span>•</span>
                  <span>{card.ageLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/documents/${card.type}/${card.id}`}>
                    <AppButton>Öffnen</AppButton>
                  </Link>
                  {card.secondaryAction && (
                    <AppButton variant="secondary" onClick={() => handleSecondary(card)}>
                      {card.secondaryAction.label}
                    </AppButton>
                  )}
                </div>
              </AppCard>
            ))}
          </div>
        </section>
      )}

      {!loading && draftCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Drafts unvollständig</h2>
            <span className="text-sm text-gray-500">{draftCards.length}</span>
          </div>
          <div className="space-y-3">
            {draftCards.map((card) => (
              <AppCard key={`${card.type}-${card.id}`} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">
                      {card.type === "invoice" ? "Rechnung" : "Angebot"} {card.number}
                    </div>
                    <div className="text-base font-semibold text-gray-900">{card.clientName}</div>
                  </div>
                  <AppBadge color={card.statusTone}>{card.statusLabel}</AppBadge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span>{card.amountLabel}</span>
                  <span>•</span>
                  <span>{card.ageLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/app/documents/${card.type}/${card.id}`}>
                    <AppButton>Öffnen</AppButton>
                  </Link>
                  {card.secondaryAction && (
                    <AppButton variant="secondary" onClick={() => handleSecondary(card)}>
                      {card.secondaryAction.label}
                    </AppButton>
                  )}
                </div>
              </AppCard>
            ))}
          </div>
        </section>
      )}

      <div className="mobile-fab sm:hidden">
        <button
          type="button"
          onClick={() => setFabOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200"
          aria-label="Neues Dokument erstellen"
        >
          <span className="text-2xl leading-none">+</span>
        </button>
      </div>

      {fabOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-gray-900/50 sm:hidden">
          <div className="w-full rounded-t-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-sm font-semibold text-gray-700">Schnell erstellen</div>
            <div className="space-y-3">
              <AppButton className="w-full justify-center" onClick={() => void openNewEditor("invoice")}>
                Neue Rechnung
              </AppButton>
              <AppButton
                variant="secondary"
                className="w-full justify-center"
                onClick={() => void openNewEditor("offer")}
              >
                Neues Angebot
              </AppButton>
              <AppButton
                variant="secondary"
                className="w-full justify-center"
                onClick={() => {
                  setFabOpen(false);
                  navigate("/app/clients");
                }}
              >
                Neuer Kunde
              </AppButton>
              <AppButton variant="ghost" className="w-full justify-center" onClick={() => setFabOpen(false)}>
                Abbrechen
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
