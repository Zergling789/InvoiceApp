import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase } from "@/supabaseClient";

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
