import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "@/supabaseClient";

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setInfo("Wenn ein Konto existiert, senden wir dir eine Mail.");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/95 p-8 text-slate-900 shadow-xl backdrop-blur">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">
                  FreelanceFlow
                </p>
                <h1 className="text-3xl font-semibold">Passwort vergessen</h1>
                <p className="text-sm text-slate-600">
                  Wir senden dir einen Link, um dein Passwort neu zu setzen.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                    E-Mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                    required
                  />
                </div>

                {error && (
                  <div
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </div>
                )}
                {info && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400"
                  disabled={loading}
                >
                  {loading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {loading ? "Bitte warten..." : "Link zum Zuruecksetzen senden"}
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <Link to="/login" className="font-semibold text-indigo-600">
                  Zurueck zum Login
                </Link>
                <Link to="/" className="font-semibold text-slate-600 hover:text-slate-800">
                  Zur Startseite
                </Link>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-900/60 to-slate-900/80 p-10 text-white shadow-2xl">
              <h2 className="text-3xl font-semibold">Einmal richtig. Dann abgeschlossen.</h2>
              <p className="mt-4 text-sm text-slate-200">
                Auch der Reset bleibt klar: eine Mail, ein Schritt, wieder im Flow.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-100">
                {[
                  "Klare Status statt Chaos",
                  "Weniger Rueckfragen vom Kunden",
                  "PDFs, die nicht ueberraschen",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-xs text-slate-300">
                Datenschutz &amp; Datenhoheit sind uns wichtig.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
