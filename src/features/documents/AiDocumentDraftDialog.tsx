import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Sparkles, X } from "lucide-react";

import { createAiDocumentDraft, type AiDocumentDraft } from "@/app/ai/aiService";
import { AppButton } from "@/ui/AppButton";

type Props = {
  documentType: "invoice" | "offer";
  currency: string;
  vatRate: number;
  onApply: (draft: AiDocumentDraft) => void;
  onClose: () => void;
};

export function AiDocumentDraftDialog({ documentType, currency, vatRate, onApply, onClose }: Props) {
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<AiDocumentDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!description.trim() || description.length > 4000) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(await createAiDocumentDraft({ description, documentType, currency, vatRate }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "KI-Vorschlag konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  };

  const updatePosition = (index: number, field: keyof AiDocumentDraft["positions"][number], value: string) => {
    setDraft((current) => current && ({
      ...current,
      positions: current.positions.map((position, positionIndex) => positionIndex === index
        ? { ...position, [field]: field === "description" || field === "unit" ? value : Number(value) }
        : position),
    }));
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <div className="app-card flex max-h-[100dvh] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-b-none p-0 sm:max-h-[90dvh] sm:rounded-[var(--app-radius-lg)]" role="dialog" aria-modal="true" aria-labelledby="ai-draft-title">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--app-border)] p-5 sm:px-7">
          <div>
            <div className="app-eyebrow">KI-Entwurf</div>
            <h2 id="ai-draft-title" className="mt-1 text-2xl font-semibold tracking-tight">Dokument mit KI erstellen</h2>
            <p className="mt-2 text-sm text-[var(--app-muted)]">Nur Leistungsangaben eingeben – keine Namen, E-Mails, Adressen oder Bankdaten.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Abbrechen" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><X size={19} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7">
        <label className="mt-5 block text-sm font-semibold" htmlFor="ai-draft-description">Leistungen beschreiben</label>
        <textarea
          id="ai-draft-description"
          rows={5}
          maxLength={4000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Zum Beispiel: Webdesign, 18 Stunden zu 95 Euro; Hosting, 12 Monate zu 15 Euro; freundliche Einleitung und 14 Tage Zahlungsziel."
          className="mt-2 w-full p-3"
          disabled={loading}
        />
        <div className="mt-1 text-right text-xs text-[var(--app-muted)]">{description.length} / 4.000</div>

        {error && <div role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        {draft && (
          <div className="mt-6 space-y-5" aria-label="KI-Vorschau">
            <div className="rounded-2xl border border-[var(--app-border)] p-4">
              <h3 className="font-semibold">Vorschlag prüfen und bearbeiten</h3>
              <div className="mt-3 space-y-2">
                {draft.positions.map((position, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_90px_120px]">
                    <input aria-label={`Beschreibung ${index + 1}`} value={position.description} onChange={(e) => updatePosition(index, "description", e.target.value)} />
                    <input aria-label={`Menge ${index + 1}`} type="number" min="0.01" step="any" value={position.quantity} onChange={(e) => updatePosition(index, "quantity", e.target.value)} />
                    <input aria-label={`Einheit ${index + 1}`} value={position.unit} onChange={(e) => updatePosition(index, "unit", e.target.value)} />
                    <input aria-label={`Preis ${index + 1}`} type="number" min="0" step="any" value={position.price} onChange={(e) => updatePosition(index, "price", e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Einleitung<textarea rows={3} className="mt-2 w-full p-3 font-normal" value={draft.introText} onChange={(e) => setDraft({ ...draft, introText: e.target.value })} /></label>
              <label className="text-sm font-semibold">Abschlusstext<textarea rows={3} className="mt-2 w-full p-3 font-normal" value={draft.footerText} onChange={(e) => setDraft({ ...draft, footerText: e.target.value })} /></label>
            </div>
            {draft.warnings.length > 0 && <div className="rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> Bitte prüfen</div><ul className="mt-2 list-disc space-y-1 pl-5">{draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
          </div>
        )}

        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:px-7">
          <AppButton variant="ghost" onClick={onClose}>Abbrechen</AppButton>
          {!draft ? <AppButton onClick={() => void generate()} disabled={loading || !description.trim()}><Sparkles size={17} /> {loading ? "Vorschlag wird erstellt …" : "Vorschlag erstellen"}</AppButton>
            : <AppButton onClick={() => onApply(draft)}>Übernehmen</AppButton>}
        </div>
      </div>
    </div>,
    document.body
  );
}
