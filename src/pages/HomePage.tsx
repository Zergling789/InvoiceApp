import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Lade…
      </div>
    );
  }

  if (hasSession) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16 text-gray-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            FreelanceFlow
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Angebote und Rechnungen schneller verwalten.
          </h1>
          <p className="text-base text-gray-600">
            Starte mit dem Login oder wirf einen Blick auf die mobile Demo-Ansicht.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Zum Login
          </Link>
          <Link
            to="/demo/angebotdetails"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
          >
            Demo ansehen
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-600">
          <p>Schon registriert? Logge dich ein, um direkt in dein Dashboard zu gelangen.</p>
        </div>
      </div>
    </div>
  );
}
