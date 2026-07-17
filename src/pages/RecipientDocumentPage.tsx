import { useEffect, useMemo, useState } from "react";
import { Check, FileText, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";

import { loadRecipientDocument, respondToOffer } from "@/app/recipient/recipientService";
import { calculateDocumentTotals } from "@/domain/rules/tax";
import type { Position } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

type RecipientData = Awaited<ReturnType<typeof loadRecipientDocument>>;
type RecipientPosition = { id?: string; description?: string; quantity?: number; price?: number; unit?: string };

export const formatRecipientDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString("de-DE");
};

export default function RecipientDocumentPage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<RecipientData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadRecipientDocument(token)
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) { setData(null); setError("Das Dokument konnte nicht geladen werden. Der Link ist möglicherweise abgelaufen oder die Verbindung wurde unterbrochen."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadToken, token]);

  const total = useMemo(() => data ? calculateDocumentTotals((data.doc.positions as Position[] | undefined) ?? [], Number(data.doc.vatRate ?? 0), Boolean(data.doc.isSmallBusiness)).grossTotal : 0, [data]);

  const respond = async (response: "ACCEPTED" | "REJECTED") => {
    setSaving(true);
    setError(null);
    try {
      const reason = response === "REJECTED" ? rejectionReason.trim() || undefined : undefined;
      await respondToOffer(token, response, reason);
      setData((current) => current ? { ...current, response, responseReason: reason ?? null } : current);
    } catch {
      setError("Ihre Antwort konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
    } finally { setSaving(false); }
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]"><div className="text-center"><RefreshCw className="mx-auto animate-spin text-[var(--app-primary)]" aria-hidden="true" /><p className="mt-3 text-sm text-[var(--app-muted)]">Dokument wird geladen …</p></div></main>;

  if (!data) return <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] p-6 text-[var(--app-text)]"><AppCard className="w-full max-w-lg p-7 text-center"><div role="alert"><FileText className="mx-auto text-[var(--app-muted)]" aria-hidden="true" /><h1 className="mt-4 text-xl font-semibold">Dokument nicht erreichbar</h1><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{error}</p></div><AppButton className="mt-5" onClick={() => setReloadToken((current) => current + 1)}><RefreshCw size={16} /> Erneut versuchen</AppButton></AppCard></main>;

  const { doc, client, settings } = data;
  const companyName = String(settings.companyName ?? "FreelanceFlow");
  const currency = String(settings.currency ?? "EUR");
  const introText = String(doc.introText ?? "").trim();
  const footerText = String(doc.footerText ?? "").trim();
  const validUntil = formatRecipientDate(doc.validUntil);
  const positions = (doc.positions as RecipientPosition[] | undefined) ?? [];

  if (data.type === "offer" && data.response === "ACCEPTED") return <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] p-5 text-[var(--app-text)] sm:p-10"><AppCard className="w-full max-w-xl p-7 text-center sm:p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><Check size={32} aria-hidden="true" /></div><div className="app-eyebrow mt-6">Angebot angenommen</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Vielen Dank für Ihre Rückmeldung!</h1><p className="mt-4 text-sm leading-6 text-[var(--app-muted)]">Sie haben das Angebot {String(doc.number ?? "")} von {companyName} angenommen. {companyName} wurde über Ihre Entscheidung informiert und meldet sich bei Bedarf bei Ihnen.</p><p className="mt-6 text-sm font-medium">Sie können dieses Browserfenster jetzt schließen.</p></AppCard></main>;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-3 text-[var(--app-text)] sm:p-10">
      <AppCard className="mx-auto max-w-3xl space-y-7 p-5 sm:p-10">
        <header className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="app-eyebrow">{data.type === "offer" ? "Angebot" : "Rechnung"}</div><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{companyName}</h1></div>
          <div className="text-sm sm:text-right"><div className="font-semibold">Nr. {String(doc.number ?? "")}</div><div className="mt-1 text-[var(--app-muted)]">{formatRecipientDate(doc.date)}</div>{data.type === "offer" && validUntil && <div className="mt-1 text-[var(--app-muted)]">Gültig bis {validUntil}</div>}</div>
        </header>

        {data.type === "offer" && <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-primary)]/5 p-5"><h2 className="font-semibold">Ihr Angebot von {companyName}</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Bitte prüfen Sie das Angebot. Am Ende der Seite können Sie es annehmen oder ablehnen. Ihre Auswahl wird direkt an {companyName} übermittelt.</p></section>}
        <section><h2 className="font-semibold">Empfänger</h2><p className="mt-1 text-sm text-[var(--app-muted)]">{String(client.companyName ?? client.name ?? "")}</p></section>
        {introText && <section><h2 className="font-semibold">Nachricht</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--app-muted)]">{introText}</p></section>}

        <section>
          <h2 className="font-semibold">Positionen</h2>
          <div className="mt-3 divide-y divide-[var(--app-border)]">{positions.map((item, index) => <div key={item.id ?? `${item.description ?? "position"}-${index}`} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"><span className="font-medium">{item.description}</span><span className="text-[var(--app-muted)] sm:text-right">{Number(item.quantity ?? 0)} {item.unit ?? "×"} · {Number(item.price ?? 0).toLocaleString("de-DE", { style: "currency", currency })}</span></div>)}</div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--app-border)] pt-4 text-lg font-semibold"><span>Gesamt</span><span>{total.toLocaleString("de-DE", { style: "currency", currency })}</span></div>
        </section>

        {data.type === "invoice" && <section className="rounded-xl border border-[var(--app-border)] p-4 text-sm"><strong>Zahlungsdaten</strong><div className="mt-2 break-all">IBAN: {String(settings.iban ?? "")}</div><div className="mt-1">Verwendungszweck: Rechnung {String(doc.number ?? "")}</div><p className="mt-2 text-xs text-[var(--app-muted)]">Der Zahlungs-QR-Code befindet sich auf der Rechnungs-PDF.</p></section>}
        {footerText && <p className="whitespace-pre-line border-t border-[var(--app-border)] pt-5 text-xs leading-5 text-[var(--app-muted)]">{footerText}</p>}

        {data.type === "offer" && <section className="border-t border-[var(--app-border)] pt-6"><h2 className="font-semibold">Wie möchten Sie antworten?</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Bitte wählen Sie eine der beiden Möglichkeiten.</p>
          {data.response ? <div className={`mt-4 rounded-xl p-4 ${data.response === "REJECTED" ? "bg-red-500/10 text-red-800 dark:text-red-200" : "bg-emerald-500/10"}`}><div className="font-semibold">Antwort gespeichert: {data.response === "ACCEPTED" ? "Angenommen" : "Abgelehnt"}</div>{data.responseReason && <p className="mt-2 whitespace-pre-line text-sm">Begründung: {data.responseReason}</p>}</div>
            : showRejectionForm ? <div className="mt-4 space-y-3 rounded-xl border border-[var(--app-border)] p-4"><label htmlFor="rejection-reason" className="block text-sm"><span className="font-medium">Optionale Begründung bei Ablehnung</span><textarea id="rejection-reason" className="app-input mt-2 min-h-24 w-full resize-y" maxLength={500} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Zum Beispiel: Der geplante Zeitraum passt leider nicht." autoFocus /><span className="mt-1 block text-right text-xs text-[var(--app-muted)]">{rejectionReason.length}/500</span></label><div className="grid gap-2 sm:flex"><AppButton variant="secondary" className="w-full justify-center sm:w-auto" disabled={saving} onClick={() => void respond("REJECTED")}>{saving ? "Antwort wird gespeichert …" : "Ablehnung bestätigen"}</AppButton><AppButton variant="ghost" className="w-full justify-center sm:w-auto" disabled={saving} onClick={() => setShowRejectionForm(false)}>Abbrechen</AppButton></div></div>
              : <div className="mt-4 grid gap-2 sm:flex"><AppButton className="w-full justify-center sm:w-auto" disabled={saving} onClick={() => void respond("ACCEPTED")}>{saving ? "Antwort wird gespeichert …" : "Angebot annehmen"}</AppButton><AppButton className="w-full justify-center sm:w-auto" variant="secondary" disabled={saving} onClick={() => setShowRejectionForm(true)}>Angebot ablehnen</AppButton></div>}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </section>}
      </AppCard>
    </main>
  );
}
