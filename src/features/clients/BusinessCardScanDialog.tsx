import { useId, useState } from "react";
import { AlertTriangle, Camera, ScanLine, X } from "lucide-react";

import { prepareBusinessCardImage, scanBusinessCard, type BusinessCardContact } from "@/app/ai/businessCardService";
import { AppButton } from "@/ui/AppButton";

type Props = { onClose: () => void; onApply: (contact: BusinessCardContact) => void };

const emptyContact: BusinessCardContact = { companyName: "", contactPerson: "", email: "", phone: "", website: "", address: "", jobTitle: "", notes: "", warnings: [] };

export function BusinessCardScanDialog({ onClose, onApply }: Props) {
  const inputId = useId();
  const [contact, setContact] = useState(emptyContact);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file?: File) => {
    if (!file) return;
    setLoading(true); setError(null); setContact(emptyContact);
    try {
      const imageDataUrl = await prepareBusinessCardImage(file);
      setPreview(imageDataUrl);
      setContact(await scanBusinessCard(imageDataUrl));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Visitenkarte konnte nicht verarbeitet werden.");
    } finally { setLoading(false); }
  };

  const hasResult = Boolean(contact.companyName || contact.contactPerson || contact.email || contact.address);
  const field = (label: string, key: keyof BusinessCardContact, multiline = false) => <label className="text-sm font-medium">{label}{multiline ? <textarea rows={3} className="mt-1 w-full p-2.5" value={String(contact[key])} onChange={(event) => setContact({ ...contact, [key]: event.target.value })} /> : <input className="mt-1 w-full p-2.5" value={String(contact[key])} onChange={(event) => setContact({ ...contact, [key]: event.target.value })} />}</label>;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <div className="flex max-h-[100dvh] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-t-2xl bg-[var(--app-surface-solid)] shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="card-scan-title">
        <header className="flex items-start justify-between border-b border-[var(--app-border)] p-5 sm:px-7"><div><div className="app-eyebrow">KI-Erkennung</div><h2 id="card-scan-title" className="mt-1 text-2xl font-semibold">Visitenkarte scannen</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Das Bild wird nur zur Erkennung übertragen und nicht dauerhaft gespeichert.</p></div><button type="button" onClick={onClose} aria-label="Schließen" className="grid h-11 w-11 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:px-7">
          <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => { void processFile(event.target.files?.[0]); event.target.value = ""; }} />
          {!preview && <button type="button" onClick={() => document.getElementById(inputId)?.click()} className="flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-black/[0.02] p-6 text-center dark:bg-white/[0.03]"><Camera size={32} className="text-[var(--app-primary)]" /><span className="mt-3 font-semibold">Foto aufnehmen oder Bild auswählen</span><span className="mt-1 text-sm text-[var(--app-muted)]">JPEG, PNG oder WebP · maximal 8 MB</span></button>}
          {preview && <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]"><div><img src={preview} alt="Aufgenommene Visitenkarte" className="w-full rounded-xl border border-[var(--app-border)] object-contain" /><AppButton type="button" variant="ghost" className="mt-2 w-full" onClick={() => document.getElementById(inputId)?.click()}><Camera size={16} />Anderes Foto</AppButton></div><div className="grid gap-3 sm:grid-cols-2">{field("Firma *", "companyName")}{field("Kontaktperson", "contactPerson")}{field("Position", "jobTitle")}{field("E-Mail", "email")}{field("Telefon", "phone")}{field("Webseite", "website")}<div className="sm:col-span-2">{field("Adresse", "address", true)}</div><div className="sm:col-span-2">{field("Notizen", "notes", true)}</div></div></div>}
          {loading && <div className="mt-4 flex items-center gap-2 text-sm text-[var(--app-muted)]"><ScanLine className="animate-pulse" size={18} />Kontaktdaten werden erkannt …</div>}
          {error && <div role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
          {contact.warnings.length > 0 && <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"><div className="flex gap-2 font-semibold"><AlertTriangle size={17} />Bitte prüfen</div><ul className="mt-2 list-disc pl-5">{contact.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--app-border)] p-4 sm:px-7"><AppButton type="button" variant="ghost" onClick={onClose}>Abbrechen</AppButton><AppButton type="button" disabled={!hasResult || !contact.companyName.trim() || loading} onClick={() => onApply(contact)}>Daten übernehmen</AppButton></footer>
      </div>
    </div>
  );
}
