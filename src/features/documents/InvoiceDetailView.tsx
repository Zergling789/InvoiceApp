import { useEffect, useState } from "react";
import { Building2, CalendarDays, FileText, MailCheck, MoreVertical, UserRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

import type { Client, Invoice, UserSettings } from "@/types";
import { formatDate } from "@/types";
import { formatMoney } from "@/utils/money";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { getTaxLabel } from "@/domain/rules/tax";
import {
  listDocumentDeliveries,
  type DocumentDelivery,
} from "@/app/email/documentDeliveryService";

type InvoiceDetailViewProps = {
  invoice: Invoice;
  client?: Client;
  settings: UserSettings;
  locale: string;
  currency: string;
  statusLabel: string;
  statusTone: "gray" | "green" | "blue" | "yellow" | "red";
  totals: { net: number; vat: number; gross: number };
  timeline: Array<{ label: string; value: string }>;
  directActions: Array<{ label: string; onSelect: () => void | Promise<void>; variant?: "primary" | "secondary"; disabled?: boolean }>;
  nextStepHint?: string;
  hasMoreActions: boolean;
  onMore: () => void;
};

const numeric = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const deliveryLabel: Record<DocumentDelivery["status"], string> = {
  processing: "Wird versendet",
  sent: "Gesendet",
  failed: "Fehlgeschlagen",
  status_unknown: "Status unklar",
  cancelled: "Abgebrochen",
};

const deliveryTone: Record<DocumentDelivery["status"], "gray" | "green" | "blue" | "yellow" | "red"> = {
  processing: "blue",
  sent: "green",
  failed: "red",
  status_unknown: "yellow",
  cancelled: "gray",
};

const formatDeliveryDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function InvoiceDetailView({
  invoice,
  client,
  settings,
  locale,
  currency,
  statusLabel,
  statusTone,
  totals,
  timeline,
  directActions,
  nextStepHint,
  hasMoreActions,
  onMore,
}: InvoiceDetailViewProps) {
  const [deliveries, setDeliveries] = useState<DocumentDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [deliveriesFailed, setDeliveriesFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setDeliveriesLoading(true);
    setDeliveriesFailed(false);
    listDocumentDeliveries({ documentType: "invoice", documentId: invoice.id, limit: 10 })
      .then((items) => {
        if (mounted) setDeliveries(items);
      })
      .catch(() => {
        if (mounted) setDeliveriesFailed(true);
      })
      .finally(() => {
        if (mounted) setDeliveriesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [invoice.id, invoice.sentCount, invoice.lastSentAt]);

  return (
    <div className="space-y-7 px-4 pb-8 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8">
      <header className="flex flex-col gap-5 border-b border-[var(--app-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="app-eyebrow">Rechnung</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{invoice.number || "Entwurf"}</h1>
            <AppBadge color={statusTone}>{statusLabel}</AppBadge>
          </div>
          <p className="mt-2 text-sm text-[var(--app-muted)]">{client?.companyName || "Unbekannter Kunde"} · {formatDate(invoice.date, locale)}</p>
        </div>
        <div className="w-full lg:w-auto">
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {directActions.map((action) => <AppButton key={action.label} className="w-full justify-center sm:w-auto" variant={action.variant ?? "secondary"} onClick={action.onSelect} disabled={action.disabled}>{action.label}</AppButton>)}
            {hasMoreActions && <AppButton className="w-full justify-center sm:w-auto" variant="ghost" onClick={onMore}><MoreVertical size={17} /> Mehr</AppButton>}
          </div>
          {nextStepHint && <p className="mt-2 max-w-md text-sm leading-5 text-[var(--app-muted)] lg:text-right"><span className="font-semibold text-[var(--app-text)]">Nächster Schritt:</span> {nextStepHint}</p>}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-5">
          <AppCard className="overflow-hidden p-0">
            <div className="border-b border-[var(--app-border)] px-5 py-4 sm:px-7"><div className="flex items-center gap-2 text-sm font-semibold"><FileText size={17} /> Rechnungspositionen</div></div>
            {invoice.introText && <p className="px-5 pt-6 text-sm leading-6 text-[var(--app-muted)] sm:px-7">{invoice.introText}</p>}
            <div className="overflow-x-auto px-5 py-5 sm:px-7">
              <div className="hidden grid-cols-[minmax(0,1fr)_90px_110px_120px_120px] gap-4 border-b border-[var(--app-border)] pb-3 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)] sm:grid">
                <span>Beschreibung</span><span>Menge</span><span>Einzelpreis</span><span>Steuer</span><span className="text-right">Gesamt</span>
              </div>
              <div className="min-w-0 divide-y divide-[var(--app-border)] sm:min-w-[680px]">
                {invoice.positions.length === 0 ? <div className="py-8 text-center text-sm text-[var(--app-muted)]">Keine Positionen vorhanden.</div> : invoice.positions.map((position) => {
                  const quantity = numeric(position.quantity);
                  const price = numeric(position.price);
                  return <div key={position.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_90px_110px_120px_120px] sm:items-center sm:gap-4"><div className="font-medium">{position.description}</div><div className="text-sm text-[var(--app-muted)]">{quantity} {position.unit}</div><div className="text-sm text-[var(--app-muted)]">{formatMoney(price, currency, locale)}</div><div className="text-sm text-[var(--app-muted)]">{getTaxLabel(position, invoice.vatRate, invoice.isSmallBusiness)}</div><div className="text-sm font-semibold sm:text-right">{formatMoney(quantity * price, currency, locale)}</div></div>;
                })}
              </div>
            </div>
            <div className="border-t border-[var(--app-border)] bg-black/[0.018] px-5 py-5 dark:bg-white/[0.025] sm:px-7">
              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between text-[var(--app-muted)]"><span>Netto</span><span>{formatMoney(totals.net, currency, locale)}</span></div>
                {!invoice.isSmallBusiness && <div className="flex justify-between text-[var(--app-muted)]"><span>MwSt. ({numeric(invoice.vatRate)}%)</span><span>{formatMoney(totals.vat, currency, locale)}</span></div>}
                <div className="flex justify-between border-t border-[var(--app-border)] pt-3 text-lg font-semibold"><span>Gesamt</span><span>{formatMoney(totals.gross, currency, locale)}</span></div>
              </div>
              {invoice.isSmallBusiness && invoice.smallBusinessNote && <p className="mt-4 text-xs text-[var(--app-muted)]">{invoice.smallBusinessNote}</p>}
            </div>
            {invoice.footerText && <p className="border-t border-[var(--app-border)] px-5 py-5 text-sm leading-6 text-[var(--app-muted)] sm:px-7">{invoice.footerText}</p>}
          </AppCard>

          <AppCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2 text-sm font-semibold"><MailCheck size={17} /> Versandhistorie</div>
              {!deliveriesLoading && <span className="text-xs text-[var(--app-muted)]">{deliveries.length} Einträge</span>}
            </div>
            {deliveriesLoading ? (
              <div role="status" className="px-5 py-8 text-center text-sm text-[var(--app-muted)] sm:px-7">Versandhistorie wird geladen …</div>
            ) : deliveriesFailed ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--app-muted)] sm:px-7">Die Versandhistorie konnte nicht geladen werden.</div>
            ) : deliveries.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[var(--app-muted)] sm:px-7">Diese Rechnung wurde noch nicht per E-Mail versendet.</div>
            ) : (
              <div className="divide-y divide-[var(--app-border)]">
                {deliveries.map((delivery) => (
                  <div key={delivery.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-7">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="break-all font-medium">{delivery.recipient}</span><AppBadge color={deliveryTone[delivery.status]}>{deliveryLabel[delivery.status]}</AppBadge></div>
                      <div className="mt-1 truncate text-sm text-[var(--app-muted)]">{delivery.subject}</div>
                      {delivery.errorMessage && <div className="mt-2 text-sm text-red-600">{delivery.errorMessage}</div>}
                    </div>
                    <time className="text-xs text-[var(--app-muted)] sm:text-right">{formatDeliveryDate(delivery.sentAt ?? delivery.failedAt ?? delivery.createdAt, locale)}</time>
                  </div>
                ))}
              </div>
            )}
          </AppCard>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <AppCard className="space-y-5 p-5">
            <div><div className="app-eyebrow">Rechnungsbetrag</div><div className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{formatMoney(totals.gross, currency, locale)}</div></div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              <div className="flex gap-3"><CalendarDays size={17} className="mt-0.5 text-[var(--app-muted)]" /><div><div className="text-xs text-[var(--app-muted)]">Rechnungsdatum</div><div className="text-sm font-medium">{formatDate(invoice.date, locale)}</div></div></div>
              <div className="flex gap-3"><CalendarDays size={17} className="mt-0.5 text-[var(--app-muted)]" /><div><div className="text-xs text-[var(--app-muted)]">Fällig am</div><div className="text-sm font-medium">{invoice.dueDate ? formatDate(invoice.dueDate, locale) : "—"}</div></div></div>
            </div>
          </AppCard>
          {invoice.projectId && <AppCard className="space-y-3 p-5"><div className="font-semibold">Projekt</div><Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-primary)] hover:underline" to={`/app/projects/${invoice.projectId}`}>Zugehöriges Projekt öffnen</Link></AppCard>}
          <AppCard className="space-y-3 p-5"><div className="flex items-center gap-2 font-semibold"><UserRound size={17} /> Kunde</div><div><div className="text-sm font-medium">{client?.companyName || "Unbekannter Kunde"}</div>{client?.contactPerson && <div className="mt-1 text-sm text-[var(--app-muted)]">{client.contactPerson}</div>}{client?.email && <div className="mt-1 break-all text-sm text-[var(--app-muted)]">{client.email}</div>}</div></AppCard>
          <AppCard className="space-y-3 p-5"><div className="flex items-center gap-2 font-semibold"><WalletCards size={17} /> Zahlung</div><div className="space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-[var(--app-muted)]">Zahlungsziel</span><span>{invoice.paymentTermsDays ?? 0} Tage</span></div>{invoice.paymentDate && <div className="flex justify-between gap-3"><span className="text-[var(--app-muted)]">Bezahlt am</span><span>{formatDate(invoice.paymentDate, locale)}</span></div>}</div></AppCard>
          <AppCard className="space-y-3 p-5"><div className="flex items-center gap-2 font-semibold"><Building2 size={17} /> Bankverbindung</div><div className="space-y-1 text-sm text-[var(--app-muted)]"><div>{settings.bankName || "—"}</div><div className="break-all">{settings.iban || "—"}</div>{settings.bic && <div>{settings.bic}</div>}</div></AppCard>
          <AppCard className="space-y-3 p-5"><div className="font-semibold">Aktivitäten</div>{timeline.length === 0 ? <div className="text-sm text-[var(--app-muted)]">Noch keine Aktivitäten.</div> : <div className="space-y-3">{timeline.map((item) => <div key={`${item.label}-${item.value}`} className="flex justify-between gap-3 text-sm"><span className="text-[var(--app-muted)]">{item.label}</span><span className="font-medium">{item.value}</span></div>)}</div>}</AppCard>
        </aside>
      </div>
    </div>
  );
}
