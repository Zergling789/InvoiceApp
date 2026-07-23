import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, FilePlus2, Plus, ReceiptText, UserPlus } from "lucide-react";

import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

import { loadDashboardData } from "@/app/dashboard/dashboardService";
import { fetchSettings } from "@/app/settings/settingsService";
import { ActionList, type ActionItem } from "@/components/dashboard/ActionList";
import { PipelineSummary } from "@/components/dashboard/PipelineSummary";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { LoadErrorCard } from "@/components/LoadErrorCard";
import type { Client, Invoice, Offer, Project, UserSettings } from "@/types";
import type { ProjectActivity, ProjectTask } from "@/domain/projects";
import { PROJECT_PHASE_LABELS, PROJECT_PRIORITY_LABELS } from "@/domain/projects";
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
  projects: Project[];
  projectActivities: ProjectActivity[];
  projectTasks: ProjectTask[];
};

const MAX_ACTIONS = 7;

export default function Dashboard() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ clients: [], offers: [], invoices: [], projects: [], projectActivities: [], projectTasks: [] });
  const [company, setCompany] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashboard, settings] = await Promise.all([loadDashboardData(), fetchSettings()]);
        setData({
          clients: dashboard.clients ?? [],
          offers: dashboard.offers ?? [],
          invoices: dashboard.invoices ?? [],
          projects: dashboard.projects ?? [],
          projectActivities: dashboard.projectActivities ?? [],
          projectTasks: dashboard.projectTasks ?? [],
        });
        setCompany(settings.companyName || null);
        setSettings(settings);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadToken]);

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
          primaryCta: { label: "Rechnung öffnen", to: `/app/invoices/${invoice.id}` },
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
          primaryCta: { label: "Rechnung öffnen", to: `/app/invoices/${invoice.id}` },
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
          subtitle: "Nachfrage fällig – bleib beim Kunden im Gespräch.",
          amountLabel: formatAmount(
            calculateDocumentTotal(offer.positions, offer.vatRate),
            currency
          ),
          ageLabel: `seit ${ageDays} Tagen`,
          statusLabel: "Nachfrage fällig",
          tone: "neutral",
          primaryCta: { label: "Angebot öffnen", to: `/app/offers/${offer.id}` },
        };
      });

    const projectTaskActions = data.projectTasks
      .filter((task) => task.projectId)
      .slice()
      .sort((a, b) => {
        const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 };
        const byPriority = priorityRank[a.priority] - priorityRank[b.priority];
        if (byPriority !== 0) return byPriority;
        return (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");
      })
      .map<ActionItem>((task) => {
        const project = data.projects.find((entry) => entry.id === task.projectId);
        const overdue = task.dueAt ? new Date(task.dueAt) < today : false;
        return {
          id: `project-task-${task.id}`,
          title: task.title,
          subtitle: project ? `Projekt ${project.name}` : "Projektaufgabe",
          amountLabel: PROJECT_PRIORITY_LABELS[task.priority],
          ageLabel: task.dueAt
            ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(task.dueAt))
            : "ohne Fälligkeit",
          statusLabel: overdue ? "Überfällig" : task.status === "in_progress" ? "In Arbeit" : "Offen",
          tone: overdue ? "critical" : task.priority === "urgent" ? "warning" : "neutral",
          primaryCta: {
            label: "Aufgabe öffnen",
            to: `/app/projects/${task.projectId}?tab=aufgaben`,
          },
        };
      });

    const actionItems = [
      ...projectTaskActions,
      ...overdueActions,
      ...openInvoiceActions,
      ...offerFollowUpActions,
    ].slice(0, MAX_ACTIONS);

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
    <div className="space-y-10 pb-8">
      <div className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="app-eyebrow">Übersicht</div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-[var(--app-text)] sm:text-4xl">{company ? `Hallo ${company}` : "Hallo"}</h1>
          <p className="text-sm text-[var(--app-muted)]">{headerSubtitle}</p>
        </div>
        <details className="group relative z-20">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full bg-[var(--app-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,113,227,0.2)] transition-colors hover:bg-[var(--app-primary-hover)]">
            <Plus size={17} /> Neu <ChevronDown size={15} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-2 shadow-[var(--app-shadow)]">
            <Link to="/app/offers/new" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"><FilePlus2 size={17} /> Angebot erstellen</Link>
            <Link to="/app/invoices/new" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"><ReceiptText size={17} /> Rechnung erstellen</Link>
            <Link to="/app/customers/new" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"><UserPlus size={17} /> Kunde anlegen</Link>
          </div>
        </details>
      </div>
      {error ? (
        <LoadErrorCard
          title="Dashboard konnte nicht geladen werden"
          retrying={loading}
          onRetry={() => setReloadToken((current) => current + 1)}
        />
      ) : (
        <>

      <section className="space-y-4">
        <SectionHeader
          title="Aktive Projekte"
          subtitle="Nach nachvollziehbarem Handlungsbedarf sortiert."
          action={<Link to="/app/projects"><AppButton variant="secondary">Alle Projekte</AppButton></Link>}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {data.projects.length === 0 && !loading ? <AppCard className="p-6 text-sm text-[var(--app-muted)]">Noch keine aktiven Projekte.</AppCard> : data.projects.map((project) => {
            const customer = data.clients.find((client) => client.id === project.clientId);
            return <Link key={project.id} to={`/app/projects/${project.id}`}><AppCard className="p-4 hover:border-[var(--app-primary)]/40"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{project.name}</div><div className="mt-1 text-sm text-[var(--app-muted)]">{customer?.companyName || customer?.contactPerson || "Noch kein Kunde"}</div></div><span className="text-xs font-semibold text-[var(--app-muted)]">{PROJECT_PRIORITY_LABELS[project.priority]}</span></div><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span>{PROJECT_PHASE_LABELS[project.phase]}</span><span className="truncate text-[var(--app-muted)]">{project.nextActionLabel || "Keine nächste Aktion"}</span></div></AppCard></Link>;
          })}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Cashflow" subtitle="Dein Fokus: Geld reinholen." />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link to="/app/documents?type=invoice&status=issued,sent,overdue" className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
          <StatCard
            title="Offen"
            value={loading ? "" : renderCurrencyTotals(derived.openInvoiceTotals)}
            subtitle="Summe offener Rechnungen"
            meta={`Rechnungen: ${derived.invoiceBucketCounts.open + derived.invoiceBucketCounts.overdue} →`}
            isLoading={loading}
          />
          </Link>
          <Link to="/app/documents?type=offer&status=draft,sent" className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
          <StatCard
            title="Potenzial"
            value={loading ? "" : renderCurrencyTotals(derived.openOfferTotals)}
            subtitle="Summe offener Angebote"
            meta={`Angebote offen: ${data.offers.filter(isOfferOpen).length} →`}
            isLoading={loading}
          />
          </Link>
          <Link to="/app/documents?type=invoice&status=overdue" className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
          <StatCard
            title="Überfällig"
            value={loading ? "" : renderCurrencyTotals(derived.overdueInvoiceTotals)}
            subtitle="Summe überfälliger Rechnungen"
            meta={`Überfällig: ${derived.invoiceBucketCounts.overdue} →`}
            tone="critical"
            isLoading={loading}
          />
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Als Nächstes"
          subtitle="Top-Prioritäten für deinen nächsten Zahlungseingang."
          action={
            <Link to="/app/todos">
              <AppButton variant="secondary">Alle To-dos</AppButton>
            </Link>
          }
        />
        <ActionList
          items={derived.actionItems}
          isLoading={loading}
          emptyState={
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-600">
              <span>✅ Alles erledigt – keine offenen Nachfragen.</span>
              <Link to="/app/offers/new">
                <AppButton>Neues Angebot erstellen</AppButton>
              </Link>
            </div>
          }
        />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Neue Projektaktivität" subtitle="Die letzten nachvollziehbaren Änderungen in deinen Projekten." />
        <AppCard className="p-5">
          {data.projectActivities.length === 0 ? <p className="text-sm text-[var(--app-muted)]">Noch keine Projektaktivitäten.</p> : <div className="divide-y divide-[var(--app-border)]">{data.projectActivities.map((activity) => <Link key={activity.id} to={`/app/projects/${activity.projectId}?tab=aktivitaeten`} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="font-medium">{activity.title}</span><time className="shrink-0 text-xs text-[var(--app-muted)]">{new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(new Date(activity.createdAt))}</time></Link>)}</div>}
        </AppCard>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Pipeline" subtitle="Angebote nach Alter und Rechnungen nach Fälligkeit." />
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

        </>
      )}

    </div>
  );
}
