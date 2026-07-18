import { AppCard } from "@/ui/AppCard";
import { Link } from "react-router-dom";

interface PipelineSummaryProps {
  offerBuckets: Record<string, number>;
  invoiceBuckets: {
    open: number;
    overdue: number;
  };
  oldestOfferAge: number;
  oldestInvoiceAge: number;
}

export function PipelineSummary({ offerBuckets, invoiceBuckets, oldestOfferAge, oldestInvoiceAge }: PipelineSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Link to="/app/documents?type=offer&status=draft,sent" className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
      <AppCard className="space-y-3 transition-transform hover:-translate-y-0.5">
        <div>
          <h3 className="text-sm font-semibold">Angebote nach Alter</h3>
          <p className="text-xs text-[var(--app-muted)]">Ältestes Angebot: {oldestOfferAge} Tage</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
            <div className="text-xs">0–3 Tage</div>
            <div className="text-lg font-semibold">{offerBuckets.Neu ?? 0}</div>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
            <div className="text-xs">4–7 Tage</div>
            <div className="text-lg font-semibold">{offerBuckets.Warm ?? 0}</div>
          </div>
          <div className="rounded-xl bg-red-500/10 p-3 text-red-800 dark:text-red-200">
            <div className="text-xs">Über 7 Tage</div>
            <div className="text-lg font-semibold">{offerBuckets.Kritisch ?? 0}</div>
          </div>
        </div>
      </AppCard>
      </Link>

      <Link to="/app/documents?type=invoice&status=issued,sent,overdue" className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
      <AppCard className="space-y-3 transition-transform hover:-translate-y-0.5">
        <div>
          <h3 className="text-sm font-semibold">Rechnungen</h3>
          <p className="text-xs text-[var(--app-muted)]">Älteste offene Rechnung: {oldestInvoiceAge} Tage</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-black/5 p-3 text-[var(--app-text)] dark:bg-white/10">
            <div className="text-xs text-[var(--app-muted)]">Offen</div>
            <div className="text-lg font-semibold">{invoiceBuckets.open}</div>
          </div>
          <div className="rounded-xl bg-red-500/10 p-3 text-red-800 dark:text-red-200">
            <div className="text-xs">Überfällig</div>
            <div className="text-lg font-semibold">{invoiceBuckets.overdue}</div>
          </div>
        </div>
      </AppCard>
      </Link>
    </div>
  );
}
