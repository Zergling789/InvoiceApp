import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { acceptCurrentLegalDocuments, getLegalAcceptanceStatus } from "@/app/legal/legalService";
import { AppButton } from "@/ui/AppButton";

export function LegalAcceptanceGate({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setCurrent((await getLegalAcceptanceStatus()).current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zustimmungsstatus konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <main className="grid min-h-screen-safe place-items-center"><p>Zustimmung wird geprüft…</p></main>;
  if (current) return <>{children}</>;

  const submit = async () => {
    if (!accepted) return;
    setSaving(true);
    setError(null);
    try {
      await acceptCurrentLegalDocuments();
      setCurrent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zustimmung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]">
      <section className="app-card w-full max-w-xl space-y-5 p-6 sm:p-8">
        <div><div className="app-eyebrow">Aktualisierte Nutzungsgrundlagen</div><h1 className="mt-2 text-2xl font-semibold">Bitte prüfe und bestätige die Dokumente</h1></div>
        <p className="text-sm leading-6 text-[var(--app-muted)]">Für die weitere Nutzung benötigen wir deine aktive Zustimmung zu den aktuell hinterlegten Versionen.</p>
        <label className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] p-4 text-sm">
          <input className="mt-1 h-4 w-4" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>Ich akzeptiere die <Link className="text-[var(--app-primary)] underline" to="/terms" target="_blank">Nutzungsbedingungen</Link> und habe die <Link className="text-[var(--app-primary)] underline" to="/privacy" target="_blank">Datenschutzerklärung</Link> zur Kenntnis genommen.</span>
        </label>
        {error && <div role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
        <div className="flex flex-wrap gap-3"><AppButton disabled={!accepted || saving} onClick={() => void submit()}>{saving ? "Wird gespeichert…" : "Zustimmen und fortfahren"}</AppButton>{error && <AppButton variant="secondary" onClick={() => void load()}>Erneut prüfen</AppButton>}</div>
      </section>
    </main>
  );
}
