import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { BetaFeedback } from "@/components/BetaFeedback";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/ui/FeedbackProvider";
import type { NavItem } from "./Sidebar";

type TopbarProps = {
  brand?: string;
  settingsHref?: string;
  navItems?: NavItem[];
};

export function Topbar({ brand = "FreelanceFlow", settingsHref = "/app/settings", navItems = [] }: TopbarProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-[var(--app-primary)] text-white"
        : "text-[var(--app-muted)] hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/10",
    ].join(" ");

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/login", { replace: true });
  };

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-surface)] backdrop-blur-xl">
      <div className="app-container flex items-center justify-between gap-3 py-3">
        <Link to="/app" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em] text-[var(--app-text)] no-underline">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--app-text)] text-sm font-bold text-[var(--app-bg)]">F</span>
          {brand}
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <NavLink to={settingsHref} className={linkClass}>
            <Settings size={16} /> Einstellungen
          </NavLink>
          <button
            type="button"
            className={linkClass({ isActive: false })}
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={16} /> {signingOut ? "Abmelden..." : "Abmelden"}
          </button>
        </nav>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/50 p-4 backdrop-blur-sm md:hidden">
          <div className="app-card max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-2 overflow-y-auto rounded-3xl bg-[var(--app-surface-solid)] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Menü</div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 h-10 w-10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                onClick={() => setMenuOpen(false)}
                aria-label="Menü schließen"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1 border-b border-[var(--app-border)] pb-3" aria-label="Mobile Navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon} {item.label}
                </NavLink>
              ))}
              <BetaFeedback variant="menu" />
            </nav>
            <ThemeToggle />
            <NavLink
              to={settingsHref}
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              <Settings size={16} /> Einstellungen
            </NavLink>
            <button
              type="button"
              className={linkClass({ isActive: false })}
              onClick={async () => {
                setMenuOpen(false);
                await handleSignOut();
              }}
              disabled={signingOut}
            >
              <LogOut size={16} /> {signingOut ? "Abmelden..." : "Abmelden"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
