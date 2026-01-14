import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/supabaseClient";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setError("Die Passwoerter stimmen nicht ueberein.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setInfo("Passwort aktualisiert. Du wirst gleich weitergeleitet.");
    setLoading(false);
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl dark:bg-indigo-500/25" />
        <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl dark:bg-sky-500/25" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 py-10 lg:flex-row lg:items-center lg:px-10">
        <div className="flex w-full justify-end lg:absolute lg:right-10 lg:top-10">
          <ThemeToggle />
        </div>
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 text-slate-900 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
                  FreelanceFlow
                </p>
                <h1 className="text-3xl font-semibold">Neues Passwort setzen</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Waehle ein neues Passwort, das du dir gut merken kannst.
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    htmlFor="password"
                  >
                    Neues Passwort
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      autoCapitalize="none"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-24 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/40"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      aria-pressed={showPassword}
                    >
                      {showPassword ? "Verbergen" : "Passwort anzeigen"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    htmlFor="passwordConfirm"
                  >
                    Passwort wiederholen
                  </label>
                  <div className="relative">
                    <input
                      id="passwordConfirm"
                      type={showPasswordConfirm ? "text" : "password"}
                      name="passwordConfirm"
                      autoComplete="new-password"
                      autoCapitalize="none"
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-24 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/40"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      aria-pressed={showPasswordConfirm}
                    >
                      {showPasswordConfirm ? "Verbergen" : "Passwort anzeigen"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </div>
                )}
                {info && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
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
                  {loading ? "Bitte warten..." : "Passwort aktualisieren"}
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-300">
                  Zurueck zum Login
                </Link>
                <Link to="/" className="font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">
                  Zur Startseite
                </Link>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white via-indigo-50 to-slate-100 p-10 text-slate-900 shadow-2xl dark:border-white/10 dark:from-slate-900/80 dark:via-indigo-900/60 dark:to-slate-900/80 dark:text-white">
              <h2 className="text-3xl font-semibold">Einmal richtig. Dann abgeschlossen.</h2>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-200">
                Setze dein Passwort neu und starte wieder mit klarem Kopf.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-700 dark:text-slate-100">
                {[
                  "Klare Status statt Chaos",
                  "Weniger Rueckfragen vom Kunden",
                  "PDFs, die nicht ueberraschen",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400 dark:bg-indigo-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-10 text-xs text-slate-500 dark:text-slate-300">
                Datenschutz &amp; Datenhoheit sind uns wichtig.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
