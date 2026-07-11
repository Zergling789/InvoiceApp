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
          <h3 className="text-sm font-semibold text-gray-700">Angebote-Pipeline</h3>
          <p className="text-xs text-gray-500">Ältestes Angebot: {oldestOfferAge} Tage</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">0–3 Tage</div>
            <div className="text-lg font-semibold text-emerald-900">{offerBuckets.Neu ?? 0}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="text-xs text-amber-700">4–7 Tage</div>
            <div className="text-lg font-semibold text-amber-900">{offerBuckets.Warm ?? 0}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <div className="text-xs text-red-700">Über 7 Tage</div>
            <div className="text-lg font-semibold text-red-900">{offerBuckets.Kritisch ?? 0}</div>
          </div>
        </div>
      </AppCard>
      </Link>

      <Link to="/app/documents?type=invoice&status=issued,sent,overdue" className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
      <AppCard className="space-y-3 transition-transform hover:-translate-y-0.5">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Rechnungen</h3>
          <p className="text-xs text-gray-500">Älteste offene Rechnung: {oldestInvoiceAge} Tage</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-600">Offen</div>
            <div className="text-lg font-semibold text-slate-900">{invoiceBuckets.open}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <div className="text-xs text-red-600">Überfällig</div>
            <div className="text-lg font-semibold text-red-900">{invoiceBuckets.overdue}</div>
          </div>
        </div>
      </AppCard>
      </Link>
    </div>
  );
}
