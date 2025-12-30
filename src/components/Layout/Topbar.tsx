import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/ui/FeedbackProvider";
import type { NavItem } from "./Sidebar";

type TopbarProps = {
  brand?: string;
  settingsHref?: string;
  navItems?: NavItem[];
};

export function Topbar({
  brand = "FreelanceFlow",
  settingsHref = "/app/settings",
  navItems = [],
}: TopbarProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
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
    <header className="sticky top-0 z-30 bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden p-2 min-h-11 min-w-11 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Navigation öffnen"
          >
            <Menu size={20} />
          </button>
          <Link to="/app" className="font-bold text-gray-900 no-underline">
            {brand}
          </Link>
        </div>
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
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-gray-900">{brand}</span>
              <button
                type="button"
                className="p-2 min-h-11 min-w-11 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Navigation schließen"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon} {item.label}
                </NavLink>
              ))}
            </div>

            <div className="mt-auto space-y-2 pt-4 border-t">
              <NavLink to={settingsHref} className={linkClass} onClick={() => setMobileOpen(false)}>
                <Settings size={16} /> Einstellungen
              </NavLink>
              <button
                type="button"
                className={linkClass({ isActive: false })}
                onClick={() => {
                  setMobileOpen(false);
                  void handleSignOut();
                }}
                disabled={signingOut}
              >
                <LogOut size={16} /> {signingOut ? "Abmelden..." : "Abmelden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
