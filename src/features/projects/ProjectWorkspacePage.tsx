import { CalendarPlus, FilePlus2, ListPlus, ReceiptText } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { AppCard } from "@/ui/AppCard";
import ProjectDetailPage from "./ProjectDetailPage";

const actionBaseClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-[transform,background-color,color,border-color,box-shadow] duration-200 active:scale-[0.98]";

const actionClasses = {
  primary:
    "bg-[var(--app-primary)] text-white shadow-[0_6px_18px_rgba(0,113,227,0.2)] hover:bg-[var(--app-primary-hover)] hover:shadow-[0_8px_22px_rgba(0,113,227,0.26)]",
  secondary:
    "border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] shadow-sm hover:bg-white/60 dark:hover:bg-white/10",
} as const;

export default function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();

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
      <ProjectDetailPage />
    </div>
  );
}
