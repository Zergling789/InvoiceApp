import { Link, NavLink } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";

type TopbarProps = {
  brand?: string;
  settingsHref?: string;
};

export function Topbar({ brand = "FreelanceFlow", settingsHref = "/app/settings" }: TopbarProps) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
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
      alert(error.message);
      return;
    }
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/app" className="font-bold text-gray-900 no-underline">
          {brand}
        </Link>
        <nav className="flex items-center gap-2">
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
    </header>
  );
}
