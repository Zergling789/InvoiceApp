import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/ui/FeedbackProvider";

type TopbarProps = {
  brand?: string;
  settingsHref?: string;
};

export function Topbar({ brand = "FreelanceFlow", settingsHref = "/app/settings" }: TopbarProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium min-h-[44px]",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60",
      isActive ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100",
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
    <header className="sticky top-0 z-30 bg-white border-b safe-top">
      <div className="app-container flex items-center justify-between">
        <Link to="/app" className="font-bold text-gray-900 no-underline">
          {brand}
        </Link>
        <nav className="hidden md:flex items-center gap-2">
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
          className="md:hidden inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 h-11 w-11"
          onClick={() => setMenuOpen(true)}
          aria-label="Menü öffnen"
        >
          <Menu size={20} />
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">Menü</div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 h-10 w-10"
                onClick={() => setMenuOpen(false)}
                aria-label="Menü schließen"
              >
                <X size={18} />
              </button>
            </div>
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
