import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfirmProvider, ToastProvider } from "@/ui/FeedbackProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import App from "./App";
import "./styles/index.css";
import { isSupabaseConfigured } from "@/supabaseClient";

function MissingLocalConfiguration() {
  return (
    <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
      <section className="app-card w-full max-w-xl p-6 sm:p-8">
        <div className="app-eyebrow">Lokale Konfiguration fehlt</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Supabase für die lokale App einrichten</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
          Erstelle im Projektordner eine Datei <code>.env.local</code> und trage die öffentliche
          Supabase-URL sowie den Anon-Key ein. Danach den Entwicklungsserver neu starten.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl bg-black/[0.05] p-4 text-sm dark:bg-white/[0.07]">{`VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
VITE_API_PROXY=http://localhost:4000`}</pre>
        <p className="mt-4 text-xs leading-5 text-[var(--app-muted)]">
          Verwende hier niemals den Supabase Service-Role-Key. Die Datei <code>.env.local</code> wird von Git ignoriert.
        </p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            {isSupabaseConfigured ? <App /> : <MissingLocalConfiguration />}
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
