import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase } from "@/supabaseClient";
import { apiFetch } from "@/app/api/apiClient";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        setAuthed(false);
      } else {
        setAuthed(Boolean(data.session));
        if (data.session) {
          try {
            const res = await apiFetch("/api/session", { method: "POST" }, { auth: true });
            if (!res.ok) {
              console.warn("Session setup failed", res.status);
            }
          } catch (err) {
            console.warn("Session setup failed", err);
          }
        }
      }
      setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="login login--loading">
        <div className="login__card">
          <p className="login__subtitle">Pruefe Login...</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
