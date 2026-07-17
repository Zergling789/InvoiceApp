import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Package, Wrench, X } from "lucide-react";
import type { PositionTemplate } from "@/app/positions/positionCatalogService";
import { AppButton } from "@/ui/AppButton";
import { AppNumberInput } from "@/ui/AppNumberInput";
import { emptyPositionForm, formFromTemplate, toTemplateInput, UNIT_OPTIONS, type PositionForm } from "./positionFormModel";

type Props = {
  template?: PositionTemplate;
  duplicate?: boolean;
  smallBusiness: boolean;
  categories: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (input: ReturnType<typeof toTemplateInput>) => Promise<void>;
};

export function PositionEditorDialog({ template, duplicate, smallBusiness, categories, busy, onClose, onSave }: Props) {
  const initial = useMemo(() => {
    const value = template ? formFromTemplate(template) : emptyPositionForm(smallBusiness);
    return duplicate ? { ...value, name: `${value.name} Kopie` } : value;
  }, [duplicate, smallBusiness, template]);
  const [form, setForm] = useState<PositionForm>(initial);
  const [more, setMore] = useState(false);
  const knownUnit = UNIT_OPTIONS.some(([value]) => value === form.unit);
  const [unitChoice, setUnitChoice] = useState(knownUnit ? form.unit : "OTHER");
  if (typeof document === "undefined") return null;
  const setTax = (value: string) => {
    if (value === "7") setForm((current) => ({ ...current, taxCategory: "REDUCED", taxRate: 7 }));
    else if (value === "0") setForm((current) => ({ ...current, taxCategory: "SMALL_BUSINESS", taxRate: 0 }));
    else setForm((current) => ({ ...current, taxCategory: "STANDARD", taxRate: 19 }));
  };
  return createPortal(
    <div className="app-visual-viewport fixed inset-x-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <div className="app-card max-h-[96%] w-full max-w-xl overflow-y-auto overscroll-contain rounded-b-none p-5 safe-bottom sm:max-h-[90%] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="position-editor-title">
        <div className="flex items-center justify-between gap-3"><h2 id="position-editor-title" className="text-xl font-semibold">{template && !duplicate ? `${template.kind === "PRODUCT" ? "Produkt" : "Leistung"} bearbeiten` : "Produkt oder Leistung anlegen"}</h2><button type="button" aria-label="Schließen" onClick={onClose}><X /></button></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["SERVICE", "PRODUCT"] as const).map((kind) => <button key={kind} type="button" className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 ${form.kind === kind ? "border-[var(--app-primary)] bg-blue-500/10" : "border-[var(--app-border)]"}`} onClick={() => setForm({ ...form, kind })}>{kind === "SERVICE" ? <Wrench /> : <Package />}<span>{kind === "SERVICE" ? "Leistung" : "Produkt"}</span></button>)}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Bezeichnung *</span><input autoFocus maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={form.kind === "PRODUCT" ? "Pflasterstein Anthrazit" : "Gartenpflege"} /></label>
          <label><span className="mb-1 block text-sm font-medium">Preis</span><AppNumberInput min={0} step="any" suffix="€" value={form.price} onEmpty={() => setForm({ ...form, price: null })} onValueChange={(price) => setForm({ ...form, price })} /><span className="mt-1 block text-xs text-[var(--app-muted)]">{form.price === null ? "Preis wird beim Verwenden ergänzt" : "Nettopreis"}</span></label>
          <label><span className="mb-1 block text-sm font-medium">Einheit *</span><select value={unitChoice} onChange={(event) => { const value = event.target.value; setUnitChoice(value); if (value !== "OTHER") setForm({ ...form, unit: value }); }}>{UNIT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{unitChoice === "OTHER" && <input className="mt-2" aria-label="Andere Einheit" maxLength={30} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />}</label>
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-medium">Mehrwertsteuer</span><select value={String(form.taxRate)} onChange={(event) => setTax(event.target.value)}><option value="19">19 % Regelsteuersatz</option><option value="7">7 % ermäßigter Steuersatz</option>{smallBusiness && <option value="0">0 % Kleinunternehmerregelung</option>}</select></label>
        </div>
        <button type="button" className="mt-5 text-sm font-medium text-[var(--app-primary)]" onClick={() => setMore((value) => !value)} aria-expanded={more}>Weitere Angaben {more ? "ausblenden" : "anzeigen"}</button>
        {more && <div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-sm">Beschreibung</span><textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="sm:col-span-2"><span className="mb-1 block text-sm">Kategorie</span><input list="position-categories" maxLength={100} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /><datalist id="position-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>{form.kind === "PRODUCT" && <><label><span className="mb-1 block text-sm">Produktnummer</span><input maxLength={100} value={form.productNumber} onChange={(event) => setForm({ ...form, productNumber: event.target.value })} /></label><label><span className="mb-1 block text-sm">Hersteller</span><input maxLength={200} value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} /></label></>}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><AppButton className="w-full sm:w-auto" variant="secondary" onClick={onClose}>Abbrechen</AppButton><AppButton className="w-full sm:w-auto" disabled={busy || !form.name.trim() || !form.unit.trim()} onClick={() => void onSave(toTemplateInput(form))}>{busy ? "Speichert …" : `${form.kind === "PRODUCT" ? "Produkt" : "Leistung"} speichern`}</AppButton></div>
      </div>
    </div>, document.body,
  );
}
