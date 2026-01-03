import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/supabaseClient";
import { formatDate } from "@/types";

type ActivityEvent = {
  id: string;
  event_type: string;
  meta: Record<string, unknown>;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  CREATED: "Erstellt",
  UPDATED: "Aktualisiert",
  SENT: "Versendet",
  FINALIZED: "Finalisiert",
  PAID: "Bezahlt",
  CONVERTED: "Umgewandelt",
};

const formatEventMeta = (eventType: string, meta: Record<string, unknown>) => {
  if (eventType === "SENT") {
    const to = typeof meta.to === "string" ? meta.to : "";
    const via = typeof meta.via === "string" ? meta.via : "";
    return [to && `An: ${to}`, via && `via ${via}`].filter(Boolean).join(" · ");
  }
  if (eventType === "CONVERTED") {
    const invoiceId = typeof meta.invoice_id === "string" ? meta.invoice_id : "";
    return invoiceId ? `Invoice: ${invoiceId}` : "";
  }
  return "";
};

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("document_activity")
        .select("id, event_type, meta, created_at")
        .eq("doc_type", docType)
        .eq("doc_id", docId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) {
        setError(error.message);
        setEvents([]);
      } else {
        setEvents((data ?? []) as ActivityEvent[]);
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
  }, [docId, docType]);

  const rendered = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        label: EVENT_LABELS[event.event_type] ?? event.event_type,
        metaText: formatEventMeta(event.event_type, event.meta ?? {}),
      })),
    [events]
  );

  if (loading) {
    return <div className="text-sm text-gray-500">Aktivität lädt…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">Aktivität konnte nicht geladen werden.</div>;
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
