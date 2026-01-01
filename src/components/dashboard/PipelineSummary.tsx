import { AppCard } from "@/ui/AppCard";

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
      <AppCard className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Angebote-Pipeline</h3>
          <p className="text-xs text-gray-500">Ältestes Angebot: {oldestOfferAge} Tage</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">Neu</div>
            <div className="text-lg font-semibold text-emerald-900">{offerBuckets.Neu ?? 0}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <div className="text-xs text-amber-700">Warm</div>
            <div className="text-lg font-semibold text-amber-900">{offerBuckets.Warm ?? 0}</div>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <div className="text-xs text-red-700">Kritisch</div>
            <div className="text-lg font-semibold text-red-900">{offerBuckets.Kritisch ?? 0}</div>
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-3">
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
    </div>
  );
}
