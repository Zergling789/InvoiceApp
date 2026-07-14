import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { loadRecipientDocument, respondToOffer } from "@/app/recipient/recipientService";
import { AppButton } from "@/ui/AppButton";
import { calculateDocumentTotals } from "@/domain/rules/tax";
import type { Position } from "@/types";

export default function RecipientDocumentPage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadRecipientDocument>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  useEffect(() => { loadRecipientDocument(token).then(setData).catch(cause => setError(cause instanceof Error ? cause.message : "Dokument konnte nicht geladen werden.")); }, [token]);
  const total = useMemo(() => data ? calculateDocumentTotals((data.doc.positions as Position[] | undefined) ?? [], Number(data.doc.vatRate ?? 0), Boolean(data.doc.isSmallBusiness)).grossTotal : 0, [data]);
  const respond = async (response: "ACCEPTED" | "REJECTED") => { setSaving(true); try { await respondToOffer(token, response, response === "REJECTED" ? rejectionReason.trim() || undefined : undefined); setData(current => current ? { ...current, response, responseReason: response === "REJECTED" ? rejectionReason.trim() || null : null } : current); } catch (cause) { setError(cause instanceof Error ? cause.message : "Antwort konnte nicht gespeichert werden."); } finally { setSaving(false); } };

  if (error && !data) return <main className="grid min-h-screen place-items-center p-6"><div role="alert" className="app-card max-w-lg p-8 text-red-600">{error}</div></main>;
  if (!data) return <main className="grid min-h-screen place-items-center">Dokument wird geladen…</main>;
  const doc = data.doc; const client = data.client; const settings = data.settings;
  const companyName = String(settings.companyName ?? "FreelanceFlow");
  const introText = String(doc.introText ?? "").trim();
  const footerText = String(doc.footerText ?? "").trim();
  const validUntil = String(doc.validUntil ?? "").trim();

  if (data.type === "offer" && data.response === "ACCEPTED") {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] p-5 text-[var(--app-text)] sm:p-10">
        <article className="app-card w-full max-w-xl p-7 text-center sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-3xl text-emerald-600" aria-hidden="true">✓</div>
          <div className="app-eyebrow mt-6">Angebot angenommen</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Vielen Dank für Ihre Rückmeldung!</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--app-muted)]">
            Sie haben das Angebot {String(doc.number ?? "")} von {companyName} erfolgreich angenommen. {companyName} wurde über Ihre Entscheidung informiert und wird sich bei Bedarf mit Ihnen in Verbindung setzen.
          </p>
          <p className="mt-6 text-sm font-medium">Sie können dieses Browserfenster jetzt schließen.</p>
        </article>
      </main>
    );
  }

  return <main className="min-h-screen bg-[var(--app-bg)] p-5 text-[var(--app-text)] sm:p-10"><article className="app-card mx-auto max-w-3xl space-y-7 p-6 sm:p-10">
    <header className="flex flex-wrap justify-between gap-4"><div><div className="app-eyebrow">{data.type === "offer" ? "Angebot" : "Rechnung"}</div><h1 className="mt-2 text-3xl font-semibold">{companyName}</h1></div><div className="text-right text-sm"><div>Nr. {String(doc.number ?? "")}</div><div>{String(doc.date ?? "")}</div>{data.type === "offer" && validUntil && <div className="mt-1 text-[var(--app-muted)]">Gültig bis {validUntil}</div>}</div></header>
    {data.type === "offer" && <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-primary)]/5 p-5"><h2 className="font-semibold">Ihr Angebot von {companyName}</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Bitte prüfen Sie die nachfolgenden Angebotsdaten. Am Ende der Seite können Sie das Angebot annehmen oder ablehnen. Ihre Auswahl wird direkt an {companyName} übermittelt.</p></section>}
    <section><h2 className="font-semibold">Empfänger</h2><p className="mt-1 text-sm text-[var(--app-muted)]">{String(client.companyName ?? client.name ?? "")}</p></section>
    {introText && <section><h2 className="font-semibold">Nachricht zum Angebot</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--app-muted)]">{introText}</p></section>}
    <section><h2 className="font-semibold">Positionen</h2><div className="mt-3 divide-y divide-[var(--app-border)]">{((doc.positions as Array<{ description?: string; quantity?: number; price?: number }>) ?? []).map((item, index) => <div key={index} className="flex justify-between gap-4 py-3 text-sm"><span>{item.description}</span><span>{Number(item.quantity ?? 0)} × {Number(item.price ?? 0).toLocaleString("de-DE", { style: "currency", currency: String(settings.currency ?? "EUR") })}</span></div>)}</div><div className="mt-4 text-right text-xl font-semibold">Gesamt {total.toLocaleString("de-DE", { style: "currency", currency: String(settings.currency ?? "EUR") })}</div></section>
    {data.type === "invoice" && <section className="rounded-xl border border-[var(--app-border)] p-4 text-sm"><strong>Zahlungsdaten</strong><div className="mt-2">IBAN: {String(settings.iban ?? "")}</div><div>Verwendungszweck: Rechnung {String(doc.number ?? "")}</div><p className="mt-2 text-xs text-[var(--app-muted)]">Der Zahlungs-QR-Code befindet sich auf der Rechnungs-PDF.</p></section>}
    {footerText && <p className="whitespace-pre-line border-t border-[var(--app-border)] pt-5 text-xs leading-5 text-[var(--app-muted)]">{footerText}</p>}
    {data.type === "offer" && <section className="border-t border-[var(--app-border)] pt-6"><h2 className="font-semibold">Wie möchten Sie antworten?</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Bitte bestätigen Sie Ihre Entscheidung über eine der folgenden Schaltflächen.</p>{data.response ? <div className="mt-4 rounded-xl bg-emerald-500/10 p-4"><div className="font-semibold">Antwort gespeichert: {data.response === "ACCEPTED" ? "Angenommen" : "Abgelehnt"}</div>{data.responseReason && <p className="mt-2 whitespace-pre-line text-sm">Begründung: {data.responseReason}</p>}</div> : showRejectionForm ? <div className="mt-4 max-w-xl space-y-3 rounded-xl border border-[var(--app-border)] p-4"><label htmlFor="rejection-reason" className="block text-sm"><span className="font-medium">Optionale Begründung bei Ablehnung</span><textarea id="rejection-reason" className="app-input mt-2 min-h-20 w-full resize-y" maxLength={500} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Zum Beispiel: Budget aktuell nicht verfügbar" autoFocus /><span className="mt-1 block text-right text-xs text-[var(--app-muted)]">{rejectionReason.length}/500</span></label><div className="flex flex-wrap gap-3"><AppButton variant="secondary" disabled={saving} onClick={() => void respond("REJECTED")}>{saving ? "Antwort wird gespeichert…" : "Ablehnung bestätigen"}</AppButton><AppButton variant="ghost" disabled={saving} onClick={() => setShowRejectionForm(false)}>Abbrechen</AppButton></div></div> : <div className="mt-4 flex flex-wrap gap-3"><AppButton disabled={saving} onClick={() => void respond("ACCEPTED")}>{saving ? "Antwort wird gespeichert…" : "Angebot annehmen"}</AppButton><AppButton variant="secondary" disabled={saving} onClick={() => setShowRejectionForm(true)}>Angebot ablehnen</AppButton></div>}{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</section>}
  </article></main>;
}
