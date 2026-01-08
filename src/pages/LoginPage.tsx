import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/supabaseClient";

type AuthMode = "login" | "signup" | "magic";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/app", { replace: true });
      }
    })();
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate("/app", { replace: true });
      return;
    }

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setInfo("Checke dein Postfach und bestaetige den Account.");
      setLoading(false);
      return;
    }

    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });

    if (magicError) {
      setError(magicError.message);
      setLoading(false);
      return;
    }

    setInfo("Der Login-Link ist unterwegs. Bitte E-Mail pruefen.");
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
                <h1 className="text-3xl font-semibold">Anmelden</h1>
                <p className="text-sm text-slate-600">
                  Schreib Rechnungen ohne jedes Mal zu zweifeln.
                </p>
              </div>

              <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-500">
                {[
                  { label: "Anmelden", value: "login" },
                  { label: "Registrieren", value: "signup" },
                  { label: "Magic Link", value: "magic" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMode(item.value)}
                    className={`rounded-full px-3 py-1.5 transition ${
                      mode === item.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
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

                {mode !== "magic" && (
                  <div className="space-y-2">
                    <label
                      className="block text-sm font-medium text-slate-700"
                      htmlFor="password"
                    >
                      Passwort
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        autoCapitalize="none"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-24 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                        aria-pressed={showPassword}
                      >
                        {showPassword ? "Verbergen" : "Passwort anzeigen"}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Angemeldet bleiben
                  </label>
                )}

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
                  {loading
                    ? "Bitte warten..."
                    : mode === "signup"
                      ? "Account erstellen"
                      : mode === "magic"
                        ? "Link senden"
                        : "Anmelden"}
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <Link to="/" className="font-semibold text-slate-600 hover:text-slate-800">
                  Zur Startseite
                </Link>
                <span className="text-slate-400">Passwort vergessen?</span>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-indigo-900/60 to-slate-900/80 p-10 text-white shadow-2xl">
              <h2 className="text-3xl font-semibold">Einmal richtig. Dann abgeschlossen.</h2>
              <p className="mt-4 text-sm text-slate-200">
                Dein Login bringt dich zurück zu einem klaren Prozess, der dich sicher bis zur
                fertigen Rechnung führt.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-100">
                {[
                  "Klare Status statt Chaos",
                  "Weniger Rückfragen vom Kunden",
                  "PDFs, die nicht überraschen",
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
