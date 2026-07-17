import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Package, Sparkles, Trash2, X } from "lucide-react";

import { createAiDocumentDraft, type AiDocumentDraft } from "@/app/ai/aiService";
import { DOCUMENT_DRAFT_TEXT_LIMIT } from "@/app/ai/documentDraftContract";
import { AppButton } from "@/ui/AppButton";
import { AppNumberInput } from "@/ui/AppNumberInput";
import { getCurrencySymbol } from "@/utils/money";

type Props = { documentType: "invoice" | "offer"; currency: string; vatRate: number; customerId?: string; onApply: (draft: AiDocumentDraft) => void; onClose: () => void };

export function AiDocumentDraftDialog({ documentType, currency, vatRate, customerId, onApply, onClose }: Props) {
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<AiDocumentDraft | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!description.trim() || description.length > DOCUMENT_DRAFT_TEXT_LIMIT) return;
    setLoading(true); setError(null);
    try {
      const response = await createAiDocumentDraft({ description, documentType, currency, vatRate, customerId });
      const next = { ...response, positions: response.positions.map((position) => ({ ...position, title: position.title ?? position.description ?? "", description: position.title ? (position.description ?? "") : "", category: position.category ?? "", internalNote: position.internalNote ?? "", subpositions: position.subpositions ?? [], priceSourceId: position.priceSourceId ?? null, priceNeedsReview: position.priceNeedsReview ?? position.price == null, taxCategory: position.taxCategory ?? (vatRate === 7 ? "REDUCED" : vatRate === 0 ? "ZERO" : "STANDARD"), taxRate: position.taxRate ?? vatRate, source: position.source ?? null })) };
      setDraft(next); setSelected(next.positions.map(() => true));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "KI-Vorschlag konnte nicht erstellt werden.");
    } finally { setLoading(false); }
  };

  const updatePosition = (index: number, field: keyof AiDocumentDraft["positions"][number], value: string | number) => setDraft((current) => current && ({ ...current, positions: current.positions.map((position, positionIndex) => positionIndex === index ? { ...position, [field]: value } : position) }));
  const removePosition = (index: number) => {
    setDraft((current) => current && ({ ...current, positions: current.positions.filter((_, positionIndex) => positionIndex !== index) }));
    setSelected((current) => current.filter((_, positionIndex) => positionIndex !== index));
  };
  if (typeof document === "undefined") return null;

  const selectedPositions = draft?.positions.filter((_, index) => selected[index]) ?? [];
  const canApply = selectedPositions.length > 0 && selectedPositions.every((position) => position.price !== null && position.title?.trim() && position.quantity > 0 && position.unit?.trim());

  return createPortal(<div className="app-visual-viewport fixed inset-x-0 z-[80] flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
    <div className="app-card flex max-h-full w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-b-none p-0 sm:max-h-[90%] sm:rounded-[var(--app-radius-lg)]" role="dialog" aria-modal="true" aria-labelledby="ai-draft-title">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--app-border)] p-5 sm:px-7"><div><div className="app-eyebrow">KI-Entwurf</div><h2 id="ai-draft-title" className="mt-1 text-2xl font-semibold tracking-tight">Dokument mit KI erstellen</h2><p className="mt-2 text-sm text-[var(--app-muted)]">Nur Leistungsangaben eingeben – keine Namen, E-Mails, Adressen oder Bankdaten.</p></div><button type="button" onClick={onClose} aria-label="Abbrechen" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><X size={19} /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7">
        <label className="mt-5 block text-sm font-semibold" htmlFor="ai-draft-description">Leistungen beschreiben</label>
        <textarea id="ai-draft-description" rows={5} maxLength={DOCUMENT_DRAFT_TEXT_LIMIT} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Zum Beispiel: Terrasse mit 40 m² neu pflastern." className="mt-2 w-full p-3" disabled={loading} />
        <div className="mt-1 text-right text-xs text-[var(--app-muted)]">{description.length} / 4.000</div>
        {error && <div role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
        {draft && <div className="mt-6 space-y-5" aria-label="KI-Vorschau">
          <div className="rounded-2xl border border-[var(--app-border)] p-4"><h3 className="font-semibold">Vorschlag prüfen und bearbeiten</h3><p className="mt-1 text-sm text-[var(--app-muted)]">Nur ausgewählte Positionen werden übernommen. Fehlende Preise müssen ergänzt werden.</p>
            <div className="mt-3 space-y-3">{draft.positions.map((position, index) => <div key={index} className="rounded-xl border border-[var(--app-border)] p-3">
              <div className="flex items-start gap-3"><input type="checkbox" className="mt-3 h-4 w-4" aria-label={`Position ${index + 1} auswählen`} checked={selected[index] ?? false} onChange={(event) => setSelected((current) => current.map((value, selectedIndex) => selectedIndex === index ? event.target.checked : value))} />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_90px_90px_120px]"><input aria-label={`Bezeichnung ${index + 1}`} maxLength={200} value={position.title} onChange={(event) => updatePosition(index, "title", event.target.value)} /><AppNumberInput aria-label={`Menge ${index + 1}`} min={0.01} step="any" value={position.quantity} onValueChange={(value) => updatePosition(index, "quantity", value)} /><input aria-label={`Einheit ${index + 1}`} maxLength={30} value={position.unit} onChange={(event) => updatePosition(index, "unit", event.target.value)} /><AppNumberInput aria-label={`Preis ${index + 1}`} className="pr-10" min={0} step="any" suffix={getCurrencySymbol(currency)} value={position.price} onValueChange={(value) => updatePosition(index, "price", value)} /><textarea className="sm:col-span-4" rows={2} aria-label={`Leistungsbeschreibung ${index + 1}`} maxLength={2000} value={position.description} onChange={(event) => updatePosition(index, "description", event.target.value)} /></div>
                <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-red-600 hover:bg-red-500/10" aria-label={`Position ${index + 1} entfernen`} onClick={() => removePosition(index)}><Trash2 size={16} /></button></div>
              {position.price === null && <div className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">Preis muss geprüft werden.</div>}
              {position.source && <div className="mt-2 flex items-center gap-2 text-xs text-[var(--app-muted)]"><Package size={14} /> Zugeordnet: {position.source.title} · {position.source.source}{position.source.productNumber ? ` · Nr. ${position.source.productNumber}` : ""}</div>}
              {position.subpositions.length > 0 && <div className="mt-2 text-xs text-[var(--app-muted)]">Enthält: {position.subpositions.join(" · ")}</div>}
            </div>)}</div>
          </div>
          {draft.warnings.length > 0 && <div className="rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} /> Bitte prüfen</div><ul className="mt-2 list-disc space-y-1 pl-5">{draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        </div>}
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)] p-4 safe-bottom sm:flex-row sm:justify-end sm:px-7"><AppButton className="w-full sm:w-auto" variant="ghost" onClick={onClose}>Abbrechen</AppButton>{!draft ? <AppButton className="w-full sm:w-auto" onClick={() => void generate()} disabled={loading || !description.trim()}><Sparkles size={17} /> {loading ? "Vorschlag wird erstellt …" : "Vorschlag erstellen"}</AppButton> : <AppButton className="w-full sm:w-auto" onClick={() => onApply({ ...draft, positions: selectedPositions })} disabled={!canApply}>Übernehmen</AppButton>}</div>
    </div>
  </div>, document.body);
}
