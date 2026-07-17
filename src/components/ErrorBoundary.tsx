import React, { type ErrorInfo, type ReactNode } from "react";
import { reportClientError } from "@/app/observability/clientErrorReporter";

type Props = { children: ReactNode };
type State = { failed: boolean; errorId?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (this.state.errorId) {
      reportClientError("REACT_RENDER_ERROR", { errorId: this.state.errorId, notify: false });
    }
    if (import.meta.env.DEV) console.error("React render error", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
        <section className="app-card w-full max-w-xl p-6 sm:p-8" role="alert">
          <div className="app-eyebrow">Unerwarteter Fehler</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Die Anwendung konnte nicht angezeigt werden.</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
            Lade die Seite neu. Falls der Fehler erneut auftritt, nenne dem Support bitte die Fehler-ID
            {this.state.errorId ? ` ${this.state.errorId}` : ""}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="app-button app-button-primary" type="button" onClick={() => window.location.reload()}>
              Seite neu laden
            </button>
            <a className="app-button app-button-secondary" href="/">
              Zur Startseite
            </a>
          </div>
        </section>
      </main>
    );
  }
}
