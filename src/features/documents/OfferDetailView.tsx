import { ArrowRight, CalendarDays, FileText, MoreVertical, ReceiptText, UserRound } from "lucide-react";

import type { Client, Offer } from "@/types";
import { formatDate } from "@/types";
import { formatMoney } from "@/utils/money";
import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { getTaxLabel } from "@/domain/rules/tax";

type TimelineItem = { label: string; value: string };

type OfferDetailViewProps = {
  offer: Offer;
  client?: Client;
  locale: string;
  currency: string;
  statusLabel: string;
  statusTone: "gray" | "green" | "blue" | "yellow" | "red";
  totals: { net: number; vat: number; gross: number };
  timeline: TimelineItem[];
  canConvert?: boolean;
  directActions: Array<{ label: string; onSelect: () => void; variant?: "primary" | "secondary" }>;
  hasMoreActions: boolean;
  onConvert: () => void;
  onMore: () => void;
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function OfferDetailView({
  offer,
  client,
  locale,
  currency,
  statusLabel,
  statusTone,
  totals,
  timeline,
  canConvert,
  directActions,
  hasMoreActions,
  onConvert,
  onMore,
}: OfferDetailViewProps) {
  return (
    <div className="space-y-7 px-4 pb-8 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8">
      <header className="flex flex-col gap-5 border-b border-[var(--app-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="app-eyebrow">Angebot</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)] sm:text-4xl">
              {offer.number || "Entwurf"}
            </h1>
            <AppBadge color={statusTone}>{statusLabel}</AppBadge>
          </div>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            {client?.companyName || "Unbekannter Kunde"} · {formatDate(offer.date, locale)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {directActions.map((action) => <AppButton key={action.label} variant={action.variant ?? "secondary"} onClick={action.onSelect}>{action.label}</AppButton>)}
          {hasMoreActions && <AppButton variant="ghost" onClick={onMore}><MoreVertical size={17} /> Mehr</AppButton>}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0 space-y-6">
          <AppCard className="overflow-hidden p-0">
            <div className="border-b border-[var(--app-border)] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={17} /> Leistungsübersicht</div>
            </div>

            {offer.introText && <p className="px-5 pt-6 text-sm leading-6 text-[var(--app-muted)] sm:px-7">{offer.introText}</p>}

            <div className="overflow-x-auto px-5 py-5 sm:px-7">
              <div className="hidden grid-cols-[minmax(0,1fr)_90px_110px_120px_120px] gap-4 border-b border-[var(--app-border)] pb-3 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)] sm:grid">
                <span>Beschreibung</span><span>Menge</span><span>Einzelpreis</span><span>Steuer</span><span className="text-right">Gesamt</span>
              </div>
              <div className="min-w-0 divide-y divide-[var(--app-border)] sm:min-w-[680px]">
                {offer.positions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--app-muted)]">Keine Positionen vorhanden.</div>
                ) : offer.positions.map((position) => {
                  const quantity = numberValue(position.quantity);
                  const price = numberValue(position.price);
                  return (
                    <div key={position.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_90px_110px_120px_120px] sm:items-center sm:gap-4">
                      <div className="font-medium text-[var(--app-text)]">{position.description}</div>
                      <div className="text-sm text-[var(--app-muted)]">{quantity} {position.unit}</div>
                      <div className="text-sm text-[var(--app-muted)]">{formatMoney(price, currency, locale)}</div>
                      <div className="text-sm text-[var(--app-muted)]">{getTaxLabel(position, offer.vatRate)}</div>
                      <div className="text-sm font-semibold sm:text-right">{formatMoney(quantity * price, currency, locale)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[var(--app-border)] bg-black/[0.018] px-5 py-5 dark:bg-white/[0.025] sm:px-7">
              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between text-[var(--app-muted)]"><span>Netto</span><span>{formatMoney(totals.net, currency, locale)}</span></div>
                <div className="flex justify-between text-[var(--app-muted)]"><span>MwSt. ({numberValue(offer.vatRate)}%)</span><span>{formatMoney(totals.vat, currency, locale)}</span></div>
                <div className="flex justify-between border-t border-[var(--app-border)] pt-3 text-lg font-semibold"><span>Gesamt</span><span>{formatMoney(totals.gross, currency, locale)}</span></div>
              </div>
            </div>
            {offer.footerText && <p className="border-t border-[var(--app-border)] px-5 py-5 text-sm leading-6 text-[var(--app-muted)] sm:px-7">{offer.footerText}</p>}
          </AppCard>

          {canConvert && (
            <button type="button" onClick={onConvert} className="group flex w-full items-center justify-between rounded-[20px] border border-blue-500/15 bg-blue-500/[0.06] p-5 text-left transition-colors hover:bg-blue-500/10">
              <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/10 text-[var(--app-primary)]"><ReceiptText size={19} /></span><span><span className="block font-semibold">In Rechnung umwandeln</span><span className="mt-0.5 block text-sm text-[var(--app-muted)]">Positionen und Kundenzuordnung werden übernommen.</span></span></span>
              <ArrowRight size={19} className="text-[var(--app-primary)] transition-transform group-hover:translate-x-1" />
            </button>
          )}
          {offer.status === "REJECTED" && offer.rejectionReason && (
            <AppCard className="border-red-500/20 bg-red-500/[0.04] p-5">
              <div className="font-semibold">Begründung des Empfängers</div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--app-muted)]">{offer.rejectionReason}</p>
            </AppCard>
          )}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <AppCard className="space-y-5 p-5">
            <div><div className="app-eyebrow">Angebotswert</div><div className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{formatMoney(totals.gross, currency, locale)}</div></div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              <div className="flex gap-3"><CalendarDays size={17} className="mt-0.5 text-[var(--app-muted)]" /><div><div className="text-xs text-[var(--app-muted)]">Erstellt</div><div className="text-sm font-medium">{formatDate(offer.date, locale)}</div></div></div>
              <div className="flex gap-3"><CalendarDays size={17} className="mt-0.5 text-[var(--app-muted)]" /><div><div className="text-xs text-[var(--app-muted)]">Gültig bis</div><div className="text-sm font-medium">{offer.validUntil ? formatDate(offer.validUntil, locale) : "—"}</div></div></div>
            </div>
          </AppCard>

          <AppCard className="space-y-3 p-5">
            <div className="flex items-center gap-2 font-semibold"><UserRound size={17} /> Kunde</div>
            <div><div className="text-sm font-medium">{client?.companyName || "Unbekannter Kunde"}</div>{client?.contactPerson && <div className="mt-1 text-sm text-[var(--app-muted)]">{client.contactPerson}</div>}{client?.email && <div className="mt-1 break-all text-sm text-[var(--app-muted)]">{client.email}</div>}</div>
          </AppCard>

          <AppCard className="space-y-3 p-5">
            <div className="font-semibold">Aktivitäten</div>
            {timeline.length === 0 ? <div className="text-sm text-[var(--app-muted)]">Noch keine Aktivitäten.</div> : <div className="space-y-3">{timeline.map((item) => <div key={`${item.label}-${item.value}`} className="flex justify-between gap-3 text-sm"><span className="text-[var(--app-muted)]">{item.label}</span><span className="font-medium">{item.value}</span></div>)}</div>}
          </AppCard>
        </aside>
      </div>
    </div>
  );
}
