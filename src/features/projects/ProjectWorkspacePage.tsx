import { useEffect, useState } from "react";
import { CalendarPlus, FilePlus2, ListPlus, MailCheck, ReceiptText } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { AppBadge } from "@/ui/AppBadge";
import { AppCard } from "@/ui/AppCard";
import {
  listProjectDeliveries,
  type DocumentDelivery,
} from "@/app/email/documentDeliveryService";
import ProjectDetailPage from "./ProjectDetailPage";

const actionBaseClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-[transform,background-color,color,border-color,box-shadow] duration-200 active:scale-[0.98]";

const actionClasses = {
  primary:
    "bg-[var(--app-primary)] text-white shadow-[0_6px_18px_rgba(0,113,227,0.2)] hover:bg-[var(--app-primary-hover)] hover:shadow-[0_8px_22px_rgba(0,113,227,0.26)]",
  secondary:
    "border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] shadow-sm hover:bg-white/60 dark:hover:bg-white/10",
} as const;

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

const formatDeliveryDate = (value: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [deliveries, setDeliveries] = useState<DocumentDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    setDeliveriesLoading(true);
    listProjectDeliveries(projectId, 5)
      .then((items) => {
        if (mounted) setDeliveries(items);
      })
      .catch(() => {
        if (mounted) setDeliveries([]);
      })
      .finally(() => {
        if (mounted) setDeliveriesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [projectId]);

  if (!projectId) return <ProjectDetailPage />;

  const returnUrl = encodeURIComponent(`/app/projects/${projectId}`);
  const actions = [
    {
      label: "Angebot erstellen",
      to: `/app/offers/new?projectId=${projectId}&returnUrl=${returnUrl}`,
      icon: FilePlus2,
      primary: true,
    },
    {
      label: "Rechnung erstellen",
      to: `/app/invoices/new?projectId=${projectId}&returnUrl=${returnUrl}`,
      icon: ReceiptText,
    },
    {
      label: "Aufgabe anlegen",
      to: `/app/projects/${projectId}?tab=aufgaben&action=new`,
      icon: ListPlus,
    },
    {
      label: "Termin anlegen",
      to: `/app/projects/${projectId}?tab=termine&action=new`,
      icon: CalendarPlus,
    },
  ];

  return (
    <div className="space-y-5">
      <AppCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="app-eyebrow">Projektzentrale</div>
            <h2 className="mt-1 text-lg font-semibold">Schnellaktionen</h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Die wichtigsten Arbeitsschritte können direkt aus dem Projekt gestartet werden.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            {actions.map(({ label, to, icon: Icon, primary }) => (
              <Link
                key={label}
                className={`${actionBaseClass} ${actionClasses[primary ? "primary" : "secondary"]}`}
                to={to}
              >
                <Icon aria-hidden="true" size={16} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </AppCard>

      <AppCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2 font-semibold"><MailCheck size={17} /> Letzte Versendungen</div>
            <p className="mt-1 text-xs text-[var(--app-muted)]">Angebote und Rechnungen dieses Projekts</p>
          </div>
          {!deliveriesLoading && <span className="text-xs text-[var(--app-muted)]">{deliveries.length} angezeigt</span>}
        </div>
        {deliveriesLoading ? (
          <div role="status" className="px-5 py-6 text-sm text-[var(--app-muted)]">Versandhistorie wird geladen …</div>
        ) : deliveries.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[var(--app-muted)]">Für dieses Projekt wurden noch keine Dokumente per E-Mail versendet.</div>
        ) : (
          <div className="divide-y divide-[var(--app-border)]">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="font-medium text-[var(--app-primary)] hover:underline" to={`/app/${delivery.documentType === "invoice" ? "invoices" : "offers"}/${delivery.documentId}`}>
                      {delivery.documentType === "invoice" ? "Rechnung" : "Angebot"}
                    </Link>
                    <AppBadge color={deliveryTone[delivery.status]}>{deliveryLabel[delivery.status]}</AppBadge>
                  </div>
                  <div className="mt-1 truncate text-sm text-[var(--app-muted)]">{delivery.recipient} · {delivery.subject}</div>
                  {delivery.errorMessage && <div className="mt-1 text-sm text-red-600">{delivery.errorMessage}</div>}
                </div>
                <time className="text-xs text-[var(--app-muted)] sm:text-right">
                  {formatDeliveryDate(delivery.sentAt ?? delivery.failedAt ?? delivery.createdAt)}
                </time>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <ProjectDetailPage />
    </div>
  );
}
