import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

import { loadDashboardData } from "@/app/dashboard/dashboardService";
import { fetchSettings } from "@/app/settings/settingsService";
import { ActionList, type ActionItem } from "@/components/dashboard/ActionList";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import type { Client, Invoice, Offer, UserSettings } from "@/types";
import { formatMoney } from "@/utils/money";
import {
  bucketOfferAge,
  calculateDocumentTotal,
  getDaysSince,
  getInvoiceReferenceDate,
  getOfferReferenceDate,
  isInvoiceOpen,
  isInvoiceOverdue,
  isOfferFollowUpDue,
  isOfferOpen,
  sortByDateAsc,
  type OfferWithFollowUp,
} from "@/utils/dashboard";

type DashboardData = {
  clients: Client[];
  offers: Offer[];
  invoices: Invoice[];
};

const MAX_ACTIONS = 7;

export default function Dashboard() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ clients: [], offers: [], invoices: [] });
  const [company, setCompany] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashboard, settings] = await Promise.all([loadDashboardData(), fetchSettings()]);
        setData(dashboard);
        setCompany(settings.companyName || null);
        setSettings(settings);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const derived = useMemo(() => {
    const today = new Date();
    const clientMap = new Map(data.clients.map((client) => [client.id, client.companyName]));
    const locale = settings?.locale ?? "de-DE";
    const settingsCurrency = settings?.currency ?? "EUR";

    const openInvoices = data.invoices.filter(isInvoiceOpen);
    const overdueInvoices = openInvoices.filter((invoice) => isInvoiceOverdue(invoice, today));
    const openOffers = data.offers.filter(isOfferOpen);

    const addTotal = (acc: Record<string, number>, currency: string, amount: number) => {
      acc[currency] = (acc[currency] ?? 0) + amount;
      return acc;
    };

    const openInvoiceTotals = openInvoices.reduce((acc, invoice) => {
      return addTotal(
        acc,
        settingsCurrency,
        calculateDocumentTotal(invoice.positions, invoice.vatRate, invoice.isSmallBusiness)
      );
    }, {} as Record<string, number>);

    const overdueInvoiceTotals = overdueInvoices.reduce((acc, invoice) => {
      return addTotal(
        acc,
        settingsCurrency,
        calculateDocumentTotal(invoice.positions, invoice.vatRate, invoice.isSmallBusiness)
      );
    }, {} as Record<string, number>);

    const openOfferTotals = openOffers.reduce((acc, offer) => {
      const currency = offer.currency ?? settingsCurrency;
      return addTotal(acc, currency, calculateDocumentTotal(offer.positions, offer.vatRate));
    }, {} as Record<string, number>);

    const formatAmount = (amount: number, currency: string) => formatMoney(amount, currency, locale);

    const overdueActions = overdueInvoices
      .slice()
      .sort((a, b) => sortByDateAsc(a.dueDate, b.dueDate))
      .map<ActionItem>((invoice) => {
        const clientName =
          invoice.clientName?.trim() ||
          invoice.clientCompanyName?.trim() ||
          clientMap.get(invoice.clientId) ||
          "Unbekannter Kunde";
        const ageDays = getDaysSince(invoice.dueDate ?? invoice.date, today);
        return {
          id: `invoice-overdue-${invoice.id}`,
          title: `${clientName} · Rechnung ${invoice.number ?? "Entwurf"}`,
          subtitle: "Zahlung überfällig – mahnen, bevor es eskaliert.",
          amountLabel: formatAmount(
            calculateDocumentTotal(invoice.positions, invoice.vatRate, invoice.isSmallBusiness),
            settingsCurrency
          ),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Überfällig",
          tone: "critical",
          primaryCta: { label: "Mahnung senden", to: `/app/invoices/${invoice.id}` },
          secondaryCta: { label: "Details", to: `/app/invoices/${invoice.id}` },
        };
      });

    const openInvoiceActions = openInvoices
      .filter((invoice) => !overdueInvoices.some((overdue) => overdue.id === invoice.id))
      .slice()
      .sort((a, b) => sortByDateAsc(getInvoiceReferenceDate(a), getInvoiceReferenceDate(b)))
      .map<ActionItem>((invoice) => {
        const clientName =
          invoice.clientName?.trim() ||
          invoice.clientCompanyName?.trim() ||
          clientMap.get(invoice.clientId) ||
          "Unbekannter Kunde";
        const ageDays = getDaysSince(getInvoiceReferenceDate(invoice), today);
        return {
          id: `invoice-open-${invoice.id}`,
          title: `${clientName} · Rechnung ${invoice.number ?? "Entwurf"}`,
          subtitle: "Rechnung offen – sende jetzt die Erinnerung.",
          amountLabel: formatAmount(
            calculateDocumentTotal(invoice.positions, invoice.vatRate, invoice.isSmallBusiness),
            settingsCurrency
          ),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Offen",
          tone: "warning",
          primaryCta: { label: "Rechnung senden", to: `/app/invoices/${invoice.id}` },
          secondaryCta: { label: "Details", to: `/app/invoices/${invoice.id}` },
        };
      });

    const offerFollowUpActions = openOffers
      .filter((offer) => isOfferFollowUpDue(offer as OfferWithFollowUp, today))
      .slice()
      .sort((a, b) => sortByDateAsc(getOfferReferenceDate(a), getOfferReferenceDate(b)))
      .map<ActionItem>((offer) => {
        const clientName = clientMap.get(offer.clientId) ?? "Unbekannter Kunde";
        const ageDays = getDaysSince(getOfferReferenceDate(offer as OfferWithFollowUp), today);
        const currency = offer.currency ?? settingsCurrency;
        return {
          id: `offer-followup-${offer.id}`,
          title: `${clientName} · Angebot ${offer.number}`,
          subtitle: "Follow-up fällig – antworte, bevor es kalt wird.",
          amountLabel: formatAmount(
            calculateDocumentTotal(offer.positions, offer.vatRate),
            currency
          ),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Follow-up fällig",
          tone: "neutral",
          primaryCta: { label: "Nachfassen", to: `/app/offers/${offer.id}` },
          secondaryCta: { label: "Details", to: `/app/offers/${offer.id}` },
        };
      });

    const actionItems = [...overdueActions, ...openInvoiceActions, ...offerFollowUpActions].slice(0, MAX_ACTIONS);

    const offerBuckets = openOffers.reduce<Record<string, number>>((acc, offer) => {
      const ageDays = getDaysSince(getOfferReferenceDate(offer as OfferWithFollowUp), today);
      const bucket = bucketOfferAge(ageDays);
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, {});

    const oldestOfferAge = openOffers.length
      ? Math.max(
          ...openOffers.map((offer) => getDaysSince(getOfferReferenceDate(offer as OfferWithFollowUp), today))
        )
      : 0;

    const oldestInvoiceAge = openInvoices.length
      ? Math.max(...openInvoices.map((invoice) => getDaysSince(invoice.dueDate ?? invoice.date, today)))
      : 0;

    return {
      openInvoiceTotals,
      overdueInvoiceTotals,
      openOfferTotals,
      actionItems,
      offerBuckets,
      oldestOfferAge,
      oldestInvoiceAge,
      invoiceBucketCounts: {
        open: openInvoices.length - overdueInvoices.length,
        overdue: overdueInvoices.length,
      },
    };
  }, [data, settings]);

  const headerSubtitle = loading
    ? "Lade aktuelle Prioritäten …"
    : `Heute: ${derived.actionItems.length} Aktionen, ${
        formatMoney(
          derived.openInvoiceTotals[settings?.currency ?? "EUR"] ?? 0,
          settings?.currency ?? "EUR",
          settings?.locale ?? "de-DE"
        )
      } offen`;

  const renderCurrencyTotals = (totals: Record<string, number>) => {
    const primaryCurrency = settings?.currency ?? "EUR";
    const locale = settings?.locale ?? "de-DE";
    const entries = Object.entries(totals);
    if (entries.length === 0) return "—";
    const ordered = entries.sort(([a], [b]) => {
      if (a === primaryCurrency) return -1;
      if (b === primaryCurrency) return 1;
      return a.localeCompare(b);
    });
    if (ordered.length === 1) {
      const [currency, amount] = ordered[0];
      return formatMoney(amount, currency, locale);
    }
    return (
      <div className="space-y-1 text-lg font-semibold">
        {ordered.map(([currency, amount]) => (
          <div key={currency} className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {currency}
            </span>
            <span>{formatMoney(amount, currency, locale)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">{company ? `Hallo ${company}` : "Hallo"}</h1>
          <p className="text-sm text-gray-600">{headerSubtitle}</p>
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}
      </div>

      <section className="space-y-4">
        <SectionHeader title="Cashflow" subtitle="Dein Fokus: Geld reinholen." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            title="Offen"
            value={loading ? "" : renderCurrencyTotals(derived.openInvoiceTotals)}
            subtitle="Summe offener Rechnungen"
            meta={`Rechnungen: ${derived.invoiceBucketCounts.open}`}
            isLoading={loading}
          />
          <StatCard
            title="Potenzial"
            value={loading ? "" : renderCurrencyTotals(derived.openOfferTotals)}
            subtitle="Summe offener Angebote"
            meta={`Angebote offen: ${data.offers.filter(isOfferOpen).length}`}
            isLoading={loading}
          />
          <StatCard
            title="Überfällig"
            value={loading ? "" : renderCurrencyTotals(derived.overdueInvoiceTotals)}
            subtitle="Summe überfälliger Rechnungen"
            meta={`Überfällig: ${derived.invoiceBucketCounts.overdue}`}
            tone="critical"
            isLoading={loading}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Jetzt erledigen"
          subtitle="Top-Prioritäten für deinen nächsten Zahlungseingang."
          action={
            <Link to="/app/invoices">
              <AppButton variant="secondary">Alle Rechnungen</AppButton>
            </Link>
          }
        />
        <ActionList
          items={derived.actionItems}
          isLoading={loading}
          emptyState={
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
              <span>✅ Alles sauber – keine offenen Follow-ups.</span>
              <Link to="/app/offers/new">
                <AppButton>Neues Angebot erstellen</AppButton>
              </Link>
            </div>
          }
        />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Pipeline" subtitle="Wo gerade Momentum entsteht." />
        {loading ? (
          <AppCard className="animate-pulse">
            <div className="h-32 rounded bg-gray-100" />
          </AppCard>
        ) : (
          <PipelineSummary
            offerBuckets={derived.offerBuckets}
            invoiceBuckets={derived.invoiceBucketCounts}
            oldestOfferAge={derived.oldestOfferAge}
            oldestInvoiceAge={derived.oldestInvoiceAge}
          />
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Schnellaktionen" subtitle="Starte neue Umsätze in Sekunden." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link to="/app/offers/new">
            <AppButton className="w-full justify-center">Angebot erstellen</AppButton>
          </Link>
          <Link to="/app/invoices/new">
            <AppButton variant="secondary" className="w-full justify-center">
              Rechnung erstellen
            </AppButton>
          </Link>
          <Link to="/app/clients">
            <AppButton variant="secondary" className="w-full justify-center">
              Kunde anlegen
            </AppButton>
          </Link>
        </div>
      </section>
    </div>
  );
}
