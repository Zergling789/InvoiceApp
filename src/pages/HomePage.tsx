import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import LandingPage from "@/pages/landing/LandingPage";
import { supabase } from "@/supabaseClient";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(data.session));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-500 flex items-center justify-center text-sm dark:bg-slate-950 dark:text-slate-400">
        Lade…
      </div>
    );
  }

  if (hasSession) {
    return <Navigate to="/app" replace />;
  }

  return <LandingPage />;
}
