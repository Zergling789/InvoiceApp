import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

import { loadDashboardData } from "@/app/dashboard/dashboardService";
import { fetchSettings } from "@/app/settings/settingsService";
import { ActionList, type ActionItem } from "@/components/dashboard/ActionList";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import type { Client, Invoice, Offer } from "@/types";
import {
  bucketOfferAge,
  calculateDocumentTotal,
  formatCurrencyEur,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ clients: [], offers: [], invoices: [] });
  const [company, setCompany] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashboard, settings] = await Promise.all([loadDashboardData(), fetchSettings()]);
        setData(dashboard);
        setCompany(settings.companyName || null);
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

    const openInvoices = data.invoices.filter(isInvoiceOpen);
    const overdueInvoices = openInvoices.filter((invoice) => isInvoiceOverdue(invoice, today));
    const openOffers = data.offers.filter(isOfferOpen);

    const openInvoiceTotal = openInvoices.reduce(
      (sum, invoice) => sum + calculateDocumentTotal(invoice.positions, invoice.vatRate),
      0
    );
    const overdueInvoiceTotal = overdueInvoices.reduce(
      (sum, invoice) => sum + calculateDocumentTotal(invoice.positions, invoice.vatRate),
      0
    );
    const openOfferTotal = openOffers.reduce(
      (sum, offer) => sum + calculateDocumentTotal(offer.positions, offer.vatRate),
      0
    );

    const overdueActions = overdueInvoices
      .slice()
      .sort((a, b) => sortByDateAsc(a.dueDate, b.dueDate))
      .map<ActionItem>((invoice) => {
        const clientName = clientMap.get(invoice.clientId) ?? "Unbekannter Kunde";
        const ageDays = getDaysSince(invoice.dueDate ?? invoice.date, today);
        return {
          id: `invoice-overdue-${invoice.id}`,
          title: `${clientName} · Rechnung ${invoice.number}`,
          subtitle: "Zahlung überfällig – mahnen, bevor es eskaliert.",
          amountLabel: formatCurrencyEur(calculateDocumentTotal(invoice.positions, invoice.vatRate)),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Überfällig",
          tone: "critical",
          primaryCta: { label: "Mahnung senden", to: `/app/documents/invoice/${invoice.id}` },
          secondaryCta: { label: "Details", to: `/app/documents/invoice/${invoice.id}` },
        };
      });

    const openInvoiceActions = openInvoices
      .filter((invoice) => !overdueInvoices.some((overdue) => overdue.id === invoice.id))
      .slice()
      .sort((a, b) => sortByDateAsc(getInvoiceReferenceDate(a), getInvoiceReferenceDate(b)))
      .map<ActionItem>((invoice) => {
        const clientName = clientMap.get(invoice.clientId) ?? "Unbekannter Kunde";
        const ageDays = getDaysSince(getInvoiceReferenceDate(invoice), today);
        return {
          id: `invoice-open-${invoice.id}`,
          title: `${clientName} · Rechnung ${invoice.number}`,
          subtitle: "Rechnung offen – sende jetzt die Erinnerung.",
          amountLabel: formatCurrencyEur(calculateDocumentTotal(invoice.positions, invoice.vatRate)),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Offen",
          tone: "warning",
          primaryCta: { label: "Rechnung senden", to: `/app/documents/invoice/${invoice.id}` },
          secondaryCta: { label: "Details", to: `/app/documents/invoice/${invoice.id}` },
        };
      });

    const offerFollowUpActions = openOffers
      .filter((offer) => isOfferFollowUpDue(offer as OfferWithFollowUp, today))
      .slice()
      .sort((a, b) => sortByDateAsc(getOfferReferenceDate(a), getOfferReferenceDate(b)))
      .map<ActionItem>((offer) => {
        const clientName = clientMap.get(offer.clientId) ?? "Unbekannter Kunde";
        const ageDays = getDaysSince(getOfferReferenceDate(offer as OfferWithFollowUp), today);
        return {
          id: `offer-followup-${offer.id}`,
          title: `${clientName} · Angebot ${offer.number}`,
          subtitle: "Follow-up fällig – antworte, bevor es kalt wird.",
          amountLabel: formatCurrencyEur(calculateDocumentTotal(offer.positions, offer.vatRate)),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Follow-up fällig",
          tone: "neutral",
          primaryCta: { label: "Nachfassen", to: `/app/documents/offer/${offer.id}` },
          secondaryCta: { label: "Details", to: `/app/documents/offer/${offer.id}` },
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
      openInvoiceTotal,
      overdueInvoiceTotal,
      openOfferTotal,
      actionItems,
      offerBuckets,
      oldestOfferAge,
      oldestInvoiceAge,
      invoiceBucketCounts: {
        open: openInvoices.length - overdueInvoices.length,
        overdue: overdueInvoices.length,
      },
    };
  }, [data]);

  const headerSubtitle = loading
    ? "Lade aktuelle Prioritäten …"
    : `Heute: ${derived.actionItems.length} Aktionen, ${formatCurrencyEur(derived.openInvoiceTotal)} offen`;

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
            value={loading ? "" : formatCurrencyEur(derived.openInvoiceTotal)}
            subtitle="Summe offener Rechnungen"
            meta={`Rechnungen: ${derived.invoiceBucketCounts.open}`}
            isLoading={loading}
          />
          <StatCard
            title="Potenzial"
            value={loading ? "" : formatCurrencyEur(derived.openOfferTotal)}
            subtitle="Summe offener Angebote"
            meta={`Angebote offen: ${data.offers.filter(isOfferOpen).length}`}
            isLoading={loading}
          />
          <StatCard
            title="Überfällig"
            value={loading ? "" : formatCurrencyEur(derived.overdueInvoiceTotal)}
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
            <Link to="/app/documents?mode=invoices">
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
              <Link to="/app/documents?mode=offers">
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
          <Link to="/app/documents?mode=offers">
            <AppButton className="w-full justify-center">Angebot erstellen</AppButton>
          </Link>
          <Link to="/app/documents?mode=invoices">
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
