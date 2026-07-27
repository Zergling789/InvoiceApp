import { CalendarPlus, FilePlus2, ListPlus, ReceiptText } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import ProjectDetailPage from "./ProjectDetailPage";

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
              <Link key={label} to={to}>
                <AppButton className="w-full justify-center" variant={primary ? "primary" : "secondary"}>
                  <Icon size={16} />
                  {label}
                </AppButton>
              </Link>
            ))}
          </div>
        </div>
      </AppCard>
      <ProjectDetailPage />
    </div>
  );
}
