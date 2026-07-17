import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { API_SESSION_EXPIRED_EVENT } from "@/app/api/apiEvents";
import { AppButton } from "@/ui/AppButton";
import { supabase } from "@/supabaseClient";
import { LegalAcceptanceGate } from "./LegalAcceptanceGate";
import { OnboardingGate } from "./OnboardingGate";

type RequireAuthProps = {
  children: React.ReactNode;
};

type AuthStatus = "checking" | "authenticated" | "anonymous" | "error";

export default function RequireAuth({ children }: RequireAuthProps) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [sessionExpired, setSessionExpired] = useState(false);

  const checkSession = useCallback(async () => {
    setStatus("checking");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setStatus("error");
      return;
    }
    setStatus(data.session ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    let active = true;
    void checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setStatus(session ? "authenticated" : "anonymous");
    });

    const handleSessionExpired = () => {
      if (!active) return;
      setSessionExpired(true);
      setStatus("anonymous");
      void supabase.auth.signOut({ scope: "local" });
    };
    window.addEventListener(API_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener(API_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [checkSession]);

  if (status === "checking") {
    return (
      <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6">
        <p role="status" className="text-sm text-[var(--app-muted)]">Anmeldung wird geprüft …</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
        <section className="app-card w-full max-w-md p-6 text-center" role="alert">
          <h1 className="text-xl font-semibold">Anmeldung konnte nicht geprüft werden</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
            Prüfe deine Internetverbindung. Deine Sitzung wurde nicht verändert.
          </p>
          <AppButton className="mt-5" onClick={() => void checkSession()}>Erneut versuchen</AppButton>
        </section>
      </main>
    );
  }

  if (status === "anonymous") {
    return <Navigate to={sessionExpired ? "/login?reason=session-expired" : "/login"} replace />;
  }

  return (
    <LegalAcceptanceGate>
      <OnboardingGate>{children}</OnboardingGate>
    </LegalAcceptanceGate>
  );
}
