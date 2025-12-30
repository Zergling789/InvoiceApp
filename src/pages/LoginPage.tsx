import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { supabase } from "@/supabaseClient";
import { apiFetch } from "@/app/api/apiClient";

type AuthMode = "login" | "signup" | "magic";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      try {
        const res = await apiFetch("/api/session", { method: "POST" }, { auth: true });
        if (!res.ok) {
          console.warn("Session setup failed", res.status);
        }
      } catch (err) {
        console.warn("Session setup failed", err);
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
    <div className="login">
      <div className="login__card">
        <header className="login__header">
          <p className="login__brand">FreelanceFlow</p>
          <h1>Login</h1>
          <p className="login__subtitle">
            Bitte melde dich an, um die Invoice App zu oeffnen.
          </p>
        </header>

        <div className="login__modes" role="tablist" aria-label="Login Optionen">
          <button
            type="button"
            className={`login__mode ${mode === "login" ? "is-active" : ""}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`login__mode ${mode === "signup" ? "is-active" : ""}`}
            onClick={() => setMode("signup")}
          >
            Registrieren
          </button>
          <button
            type="button"
            className={`login__mode ${mode === "magic" ? "is-active" : ""}`}
            onClick={() => setMode("magic")}
          >
            Magic Link
          </button>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {mode !== "magic" && (
            <label className="login__field">
              <span>Passwort</span>
              <input
                type="password"
                name="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          )}

          {error && (
            <div className="login__error" role="alert">
              {error}
            </div>
          )}
          {info && <div className="login__info">{info}</div>}

          <button type="submit" className="login__submit" disabled={loading}>
            {loading
              ? "Bitte warten..."
              : mode === "signup"
                ? "Account erstellen"
                : mode === "magic"
                  ? "Link senden"
                  : "Anmelden"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="login__footer">
          <Link to="/" className="login__back">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
