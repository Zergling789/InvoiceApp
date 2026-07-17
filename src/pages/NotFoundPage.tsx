import { Link } from "react-router-dom";
import { FileText, LayoutDashboard } from "lucide-react";

import { AppCard } from "@/ui/AppCard";

type Props = {
  authenticated?: boolean;
};

const linkBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors";

export function NotFoundPage({ authenticated = false }: Props) {
  return (
    <main className="grid min-h-[70vh] place-items-center px-5 py-12 text-[var(--app-text)]">
      <AppCard className="w-full max-w-xl p-6 text-center sm:p-9">
        <div className="app-eyebrow">Fehler 404</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Seite nicht gefunden</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">
          Der Link ist nicht mehr gültig oder die Seite wurde verschoben. Du kannst sicher zu einem
          bekannten Bereich zurückkehren.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to={authenticated ? "/app" : "/"}
            className={`${linkBase} bg-[var(--app-primary)] text-white hover:bg-[var(--app-primary-hover)]`}
          >
            <LayoutDashboard size={17} aria-hidden="true" />
            {authenticated ? "Zum Dashboard" : "Zur Startseite"}
          </Link>
          <Link
            to={authenticated ? "/app/documents" : "/login"}
            className={`${linkBase} border border-[var(--app-border)] bg-[var(--app-surface-solid)] hover:bg-black/5 dark:hover:bg-white/10`}
          >
            <FileText size={17} aria-hidden="true" />
            {authenticated ? "Zu den Dokumenten" : "Anmelden"}
          </Link>
        </div>
      </AppCard>
    </main>
  );
}
