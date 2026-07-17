import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BetaFeedback } from "@/components/BetaFeedback";

export function AppShell({ navItems }: { navItems: NavItem[] }) {
  const location = useLocation();
  const isOnboarding = location.pathname === "/app/onboarding";

  if (isOnboarding) {
    return (
      <div className="min-h-screen-safe bg-[var(--app-bg)] text-[var(--app-text)]">
        <main id="main-content" className="animate-enter">
          <Suspense fallback={<RouteLoadingFallback />}><Outlet /></Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-[var(--app-bg)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow dark:focus:bg-slate-900 dark:focus:text-slate-100"
      >
        Zum Inhalt springen
      </a>
      <Topbar navItems={navItems} />
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">Geschlossene Beta · Nur einfache deutsche B2B-Fälle · Dokumente vor Versand prüfen · Keine Steuer- oder Rechtsberatung · Support über die Kontaktseite</div>

      <div className="app-container">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[232px_minmax(0,1fr)] md:gap-8 lg:gap-10">
          <div className="hidden md:block">
            <Sidebar items={navItems} />
          </div>

          <main id="main-content" className="min-w-0 animate-enter">
            <Suspense fallback={<RouteLoadingFallback />}><Outlet /></Suspense>
          </main>
        </div>
      </div>

      <div className="hidden md:block">
        <BetaFeedback />
      </div>
    </div>
  );
}

function RouteLoadingFallback() {
  return <div role="status" className="app-card p-6 text-sm text-[var(--app-muted)]">Bereich wird geladen …</div>;
}

export default AppShell;
