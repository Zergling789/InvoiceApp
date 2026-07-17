import { useEffect, useMemo, useState } from "react";

import { formatDate } from "@/types";
import { dbListDocumentActivity } from "@/db/documentActivityDb";
import { AppButton } from "@/ui/AppButton";

type ActivityEvent = Awaited<ReturnType<typeof dbListDocumentActivity>>[number];

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Erstellt",
  UPDATED: "Aktualisiert",
  SENT: "Versendet",
  FINALIZED: "Finalisiert",
  PAID: "Bezahlt",
  CONVERTED: "Umgewandelt",
  ACCEPTED: "Angebot angenommen",
  REJECTED: "Angebot abgelehnt",
};

const formatEventMeta = (eventType: string, meta: Record<string, unknown>) => {
  if (eventType === "SENT") {
    const to = typeof meta.to === "string" ? meta.to : "";
    const via = typeof meta.via === "string" ? meta.via : "";
    return [to && `An: ${to}`, via && `via ${via}`].filter(Boolean).join(" · ");
  }
  if (eventType === "CONVERTED") {
    const invoiceId = typeof meta.invoice_id === "string" ? meta.invoice_id : "";
    return invoiceId ? `Rechnung: ${invoiceId}` : "";
  }
  return "";
};

const asMetaRecord = (meta: ActivityEvent["meta"]): Record<string, unknown> =>
  meta && typeof meta === "object" && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};

export function ActivityTimeline({
  docType,
  docId,
}: {
  docType: "offer" | "invoice";
  docId: string;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dbListDocumentActivity(docType, docId);
        if (!active) return;
        setEvents(data);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        setError(message);
        setEvents([]);
      }
      setLoading(false);
    };

    if (docId) {
      void load();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [docId, docType, reloadToken]);

  const rendered = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        label: EVENT_LABELS[event.event_type.toUpperCase()] ?? event.event_type,
        metaText: formatEventMeta(event.event_type, asMetaRecord(event.meta)),
      })),
    [events]
  );

  if (loading) {
    return <div className="text-sm text-gray-500">Aktivität lädt…</div>;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          Aktivitäten konnten nicht geladen werden.
        </p>
        <AppButton
          className="mt-3"
          type="button"
          variant="secondary"
          onClick={() => setReloadToken((current) => current + 1)}
        >
          Erneut versuchen
        </AppButton>
      </div>
    );
  }

  if (!rendered.length) {
    return <div className="text-sm text-gray-500">Noch keine Aktivitäten.</div>;
  }

  return (
    <div className="space-y-3">
      {rendered.map((event) => (
        <div key={event.id} className="rounded border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-800">{event.label}</div>
            <div className="text-xs text-gray-500">
              {formatDate(event.created_at, "de-DE")}
            </div>
          </div>
          {event.metaText && <div className="mt-1 text-sm text-gray-600">{event.metaText}</div>}
        </div>
      ))}
    </div>
  );
}
