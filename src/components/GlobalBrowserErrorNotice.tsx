import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  CLIENT_ERROR_EVENT,
  type ClientErrorEventDetail,
} from "@/app/observability/clientErrorReporter";

export function GlobalBrowserErrorNotice() {
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as ClientErrorEventDetail | undefined;
      if (typeof detail?.errorId === "string") setErrorId(detail.errorId);
    };

    window.addEventListener(CLIENT_ERROR_EVENT, handleError);
    return () => window.removeEventListener(CLIENT_ERROR_EVENT, handleError);
  }, []);

  if (!errorId) return null;

  return (
    <aside
      className="fixed inset-x-4 top-4 z-[100] mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-red-500/30 bg-[var(--app-surface-solid)] p-4 text-sm text-[var(--app-text)] shadow-2xl"
      role="alert"
      aria-live="assertive"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Eine Aktion konnte nicht abgeschlossen werden.</p>
        <p className="mt-1 leading-5 text-[var(--app-muted)]">
          Versuche es erneut. Falls der Fehler wieder auftritt, nenne dem Support die Fehler-ID {errorId}.
        </p>
      </div>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--app-muted)] hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/10"
        aria-label="Fehlerhinweis schließen"
        onClick={() => setErrorId(null)}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
