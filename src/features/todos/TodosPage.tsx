import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { Client, Invoice, Offer } from "@/types";
import { InvoiceStatus, OfferStatus } from "@/types";
import { loadDashboardData } from "@/app/dashboard/dashboardService";
import {
  calculateDocumentTotal,
  formatCurrencyEur,
  getDaysSince,
  getInvoiceReferenceDate,
  getOfferReferenceDate,
  isInvoiceOpen,
  isInvoiceOverdue,
  isOfferFollowUpDue,
  type OfferWithFollowUp,
} from "@/utils/dashboard";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useToast } from "@/ui/FeedbackProvider";

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
  secondaryLabel?: string;
};

type FilterType = "all" | "invoices" | "offers";

const DAY_MS = 86400000;

const daysUntil = (dateStr?: string | null, today = new Date()) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.ceil((date.getTime() - today.getTime()) / DAY_MS));
};

export default function TodosPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ clients: [], offers: [], invoices: [] });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const nextData = await loadDashboardData();
        if (mounted) {
          setData(nextData);
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
        ? data.invoices.filter((invoice) => isInvoiceOpen(invoice) && isInvoiceOverdue(invoice, today))
        : [],
    [data.invoices, showInvoices, today]
  );

  const openInvoices = useMemo(
    () =>
      showInvoices
        ? data.invoices.filter((invoice) => isInvoiceOpen(invoice) && !isInvoiceOverdue(invoice, today))
        : [],
    [data.invoices, showInvoices, today]
  );

  const followUpOffers = useMemo(
    () =>
      showOffers
        ? data.offers.filter((offer) => isOfferFollowUpDue(offer as OfferWithFollowUp, today))
        : [],
    [data.offers, showOffers, today]
  );

  const draftItems = useMemo(() => {
    const items: Array<{ type: "invoice" | "offer"; data: Invoice | Offer }> = [];
    if (showInvoices) {
      data.invoices.forEach((invoice) => {
        const isIncomplete =
          invoice.status === InvoiceStatus.DRAFT &&
          ((invoice.positions ?? []).length === 0 || !invoice.clientId || invoice.vatRate == null);
        if (isIncomplete) items.push({ type: "invoice", data: invoice });
      });
    }
    if (showOffers) {
      data.offers.forEach((offer) => {
        const isIncomplete =
          offer.status === OfferStatus.DRAFT &&
          ((offer.positions ?? []).length === 0 || !offer.clientId || offer.vatRate == null);
        if (isIncomplete) items.push({ type: "offer", data: offer });
      });
    }
    return items;
  }, [data.invoices, data.offers, showInvoices, showOffers]);

  const buildInvoiceCard = (invoice: Invoice, options: { statusLabel: string; tone: TodoCard["statusTone"]; ageLabel: string; secondaryLabel?: string }) => {
    const total = calculateDocumentTotal(invoice.positions ?? [], Number(invoice.vatRate ?? 0));
    return {
      id: invoice.id,
      type: "invoice" as const,
      number: invoice.number,
      clientName: clientNameById.get(invoice.clientId) ?? "Unbekannter Kunde",
      amountLabel: formatCurrencyEur(total),
      statusLabel: options.statusLabel,
      statusTone: options.tone,
      ageLabel: options.ageLabel,
      secondaryLabel: options.secondaryLabel,
    };
  };

  const buildOfferCard = (offer: Offer, options: { statusLabel: string; tone: TodoCard["statusTone"]; ageLabel: string; secondaryLabel?: string }) => {
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
      secondaryLabel: options.secondaryLabel,
    };
  };

  const overdueInvoiceCards = overdueInvoices.map((invoice) =>
    buildInvoiceCard(invoice, {
      statusLabel: "Überfällig",
      tone: "red",
      ageLabel: `seit ${getDaysSince(invoice.dueDate ?? invoice.date, today)} Tagen`,
      secondaryLabel: "Mahnung senden",
    })
  );

  const openInvoiceCards = openInvoices.map((invoice) => {
    const dueLabel = invoice.dueDate
      ? `fällig in ${daysUntil(invoice.dueDate, today)} Tagen`
      : `seit ${getDaysSince(getInvoiceReferenceDate(invoice), today)} Tagen`;
    return buildInvoiceCard(invoice, {
      statusLabel: "Offen",
      tone: "yellow",
      ageLabel: dueLabel,
      secondaryLabel: "Erinnerung senden",
    });
  });

  const followUpOfferCards = followUpOffers.map((offer) =>
    buildOfferCard(offer, {
      statusLabel: "Follow-up fällig",
      tone: "blue",
      ageLabel: `seit ${getDaysSince(getOfferReferenceDate(offer as OfferWithFollowUp), today)} Tagen`,
      secondaryLabel: "Follow-up",
    })
  );

  const draftCards = draftItems.map((item) => {
    if (item.type === "invoice") {
      const invoice = item.data as Invoice;
      return buildInvoiceCard(invoice, {
        statusLabel: "Entwurf unvollständig",
        tone: "gray",
        ageLabel: `seit ${getDaysSince(invoice.date, today)} Tagen`,
        secondaryLabel: "Vervollständigen",
      });
    }
    const offer = item.data as Offer;
    return buildOfferCard(offer, {
      statusLabel: "Entwurf unvollständig",
      tone: "gray",
      ageLabel: `seit ${getDaysSince(offer.date, today)} Tagen`,
      secondaryLabel: "Vervollständigen",
    });
  });

  const totalCards =
    overdueInvoiceCards.length +
    openInvoiceCards.length +
    followUpOfferCards.length +
    draftCards.length;

  const handleSecondary = (label?: string) => {
    if (!label) return;
    toast.info(`${label} kommt als Nächstes.`);
  };

  return (
    <div className="space-y-6">
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
            <Link to="/app/offers">
              <AppButton>Neues Angebot</AppButton>
            </Link>
            <Link to="/app/invoices">
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
                  {card.secondaryLabel && (
                    <AppButton
                      variant="secondary"
                      onClick={() => handleSecondary(card.secondaryLabel)}
                    >
                      {card.secondaryLabel}
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
                  {card.secondaryLabel && (
                    <AppButton
                      variant="secondary"
                      onClick={() => handleSecondary(card.secondaryLabel)}
                    >
                      {card.secondaryLabel}
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
                  {card.secondaryLabel && (
                    <AppButton
                      variant="secondary"
                      onClick={() => handleSecondary(card.secondaryLabel)}
                    >
                      {card.secondaryLabel}
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
                  {card.secondaryLabel && (
                    <AppButton
                      variant="secondary"
                      onClick={() => handleSecondary(card.secondaryLabel)}
                    >
                      {card.secondaryLabel}
                    </AppButton>
                  )}
                </div>
              </AppCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
