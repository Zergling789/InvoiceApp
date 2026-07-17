import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  getOnboardingProgress,
  ONBOARDING_PROGRESS_EVENT,
  type OnboardingProgress,
} from "@/app/onboarding/onboardingService";
import { AppButton } from "@/ui/AppButton";

const isAllowedOnboardingRoute = (pathname: string, search: string) => {
  if (pathname === "/app/onboarding") return true;
  if (!new URLSearchParams(search).has("onboarding")) return false;
  return pathname === "/app/customers/new" || pathname === "/app/offers/new";
};

export function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProgress(await getOnboardingProgress());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Einrichtung konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const next = (event as CustomEvent<OnboardingProgress>).detail;
      if (next) setProgress(next);
    };
    window.addEventListener(ONBOARDING_PROGRESS_EVENT, handleProgress);
    return () =>
      window.removeEventListener(ONBOARDING_PROGRESS_EVENT, handleProgress);
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6">
        <p className="text-sm text-[var(--app-muted)]">Einrichtung wird geladen…</p>
      </main>
    );
  }

  if (error || !progress) {
    return (
      <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6">
        <section className="app-card w-full max-w-lg space-y-4 p-6">
          <h1 className="text-xl font-semibold">Einrichtung nicht erreichbar</h1>
          <p role="alert" className="text-sm text-[var(--app-muted)]">
            {error ?? "Bitte versuche es erneut."}
          </p>
          <AppButton onClick={() => void load()}>Erneut versuchen</AppButton>
        </section>
      </main>
    );
  }

  if (
    progress.step !== "DONE" &&
    !isAllowedOnboardingRoute(location.pathname, location.search)
  ) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <>{children}</>;
}
