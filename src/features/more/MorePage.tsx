import { Link } from "react-router-dom";
import { ChevronRight, CreditCard, FolderKanban, PackageSearch, Settings } from "lucide-react";

import { AppCard } from "@/ui/AppCard";

const links = [
  {
    to: "/app/projects",
    label: "Projekte",
    description: "Projektstatus, Budgets und Aufgaben verwalten.",
    icon: <FolderKanban size={18} />,
  },
  {
    to: "/app/positions",
    label: "Produkte & Leistungen",
    description: "Häufige Produkte, Leistungen und Pakete verwalten.",
    icon: <PackageSearch size={18} />,
  },
  {
    to: "/app/settings",
    label: "Einstellungen",
    description: "Logo, Nummernkreise und Absenderdaten.",
    icon: <Settings size={18} />,
  },
  {
    to: "/app/plans",
    label: "Tarife & Abrechnung",
    description: "Tarife vergleichen und Abonnement verwalten.",
    icon: <CreditCard size={18} />,
  },
];

export default function MorePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="app-eyebrow">Arbeitsbereich</div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--app-text)]">Mehr</h1>
        <p className="text-sm text-[var(--app-muted)]">Projekte, gespeicherte Leistungen und Einstellungen.</p>
      </div>

      <div className="space-y-3">
        {links.map((item) => (
          <Link key={item.to} to={item.to} className="block rounded-[var(--app-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
            <AppCard className="flex min-h-[76px] items-center justify-between gap-4 p-4 hover:border-[var(--app-primary)]/40 hover:bg-[var(--app-primary)]/[0.04]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-xl bg-[var(--app-primary)]/10 p-2 text-[var(--app-primary)]">{item.icon}</span>
                <div>
                  <div className="font-semibold text-[var(--app-text)]">{item.label}</div>
                  <div className="mt-1 text-sm text-[var(--app-muted)]">{item.description}</div>
                </div>
              </div>
              <ChevronRight className="shrink-0 text-[var(--app-muted)]" size={18} aria-hidden="true" />
            </AppCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
