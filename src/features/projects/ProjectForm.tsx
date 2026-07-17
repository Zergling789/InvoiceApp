import { useEffect, useMemo } from "react";
import { Save, X } from "lucide-react";

import { getClientDisplayName } from "@/domain/models/Client";
import type { Client, Project } from "@/types";
import { getCurrencySymbol } from "@/utils/money";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppNumberInput } from "@/ui/AppNumberInput";

export type DraftProject = {
  id?: string;
  name: string;
  clientId: string;
  budgetType: Project["budgetType"];
  hourlyRate: number;
  budgetTotal: number;
  status: Project["status"];
};

type ProjectFormProps = {
  value: DraftProject;
  initialValue: DraftProject;
  clients: Client[];
  onChange: (next: DraftProject) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  showHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onCreateClient?: () => void;
  currency?: string;
  locale?: string;
};

const inputClass = "app-input mt-1 w-full";

export function ProjectForm({
  value,
  initialValue,
  clients,
  onChange,
  onSave,
  onCancel,
  saving = false,
  showHeader = true,
  onDirtyChange,
  onCreateClient,
  currency = "EUR",
  locale = "de-DE",
}: ProjectFormProps) {
  const currencySymbol = getCurrencySymbol(currency, locale);
  const isDirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(initialValue), [initialValue, value]);
  const canSave = Boolean(value.name.trim() && value.clientId && !saving);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <div className="space-y-4">
      {showHeader && <div><div className="app-eyebrow">Neuer Auftrag</div><h2 className="mt-1 text-xl font-semibold">Projekt anlegen</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Kunde und geplanten Umfang festhalten.</p></div>}

      <AppCard className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="project-name" className="text-sm font-medium">Projektname *<input id="project-name" className={inputClass} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Zum Beispiel: Terrasse Familie Müller" autoComplete="off" /></label>
          <label htmlFor="project-client" className="text-sm font-medium">Kunde *<select id="project-client" className={inputClass} value={value.clientId} onChange={(event) => onChange({ ...value, clientId: event.target.value })}><option value="">Kunde auswählen</option>{clients.map((client) => <option key={client.id} value={client.id}>{getClientDisplayName(client)}</option>)}</select>{clients.length === 0 && <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-700"><span>Für ein Projekt brauchst du zuerst einen Kunden.</span>{onCreateClient && <button type="button" className="font-semibold underline underline-offset-2" onClick={onCreateClient}>Kunden anlegen</button>}</span>}</label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Wie wird der Auftrag berechnet?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className={`cursor-pointer rounded-xl border p-3 ${value.budgetType === "hourly" ? "border-[var(--app-primary)] bg-blue-500/10" : "border-[var(--app-border)]"}`}><input type="radio" name="budgetType" value="hourly" checked={value.budgetType === "hourly"} onChange={() => onChange({ ...value, budgetType: "hourly" })} className="mr-2" /><span className="font-medium">Nach Stunden</span><span className="mt-1 block pl-6 text-xs text-[var(--app-muted)]">Stundensatz und geplante Stunden</span></label>
            <label className={`cursor-pointer rounded-xl border p-3 ${value.budgetType === "fixed" ? "border-[var(--app-primary)] bg-blue-500/10" : "border-[var(--app-border)]"}`}><input type="radio" name="budgetType" value="fixed" checked={value.budgetType === "fixed"} onChange={() => onChange({ ...value, budgetType: "fixed" })} className="mr-2" /><span className="font-medium">Festpreis</span><span className="mt-1 block pl-6 text-xs text-[var(--app-muted)]">Ein vereinbarter Gesamtbetrag</span></label>
          </div>
        </fieldset>

        {value.budgetType === "hourly" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="project-hourly-rate" className="text-sm font-medium">Stundensatz<AppNumberInput id="project-hourly-rate" className={`${inputClass} pr-10`} value={value.hourlyRate} onValueChange={(hourlyRate) => onChange({ ...value, hourlyRate })} min={0} step="any" suffix={currencySymbol} /></label>
            <label htmlFor="project-hours" className="text-sm font-medium">Geplante Stunden<AppNumberInput id="project-hours" className={`${inputClass} pr-12`} value={value.budgetTotal} onValueChange={(budgetTotal) => onChange({ ...value, budgetTotal })} min={0} step="any" suffix="Std." /></label>
          </div>
        ) : (
          <label htmlFor="project-fixed-price" className="block max-w-sm text-sm font-medium">Vereinbarter Festpreis<AppNumberInput id="project-fixed-price" className={`${inputClass} pr-10`} value={value.budgetTotal} onValueChange={(budgetTotal) => onChange({ ...value, budgetTotal })} min={0} step="any" suffix={currencySymbol} /></label>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--app-border)] pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="ghost" disabled={saving} onClick={onCancel}><X size={16} /> Abbrechen</AppButton>
          <AppButton disabled={!canSave} onClick={onSave}><Save size={16} /> {saving ? "Wird gespeichert…" : "Projekt anlegen"}</AppButton>
        </div>
      </AppCard>
    </div>
  );
}

export default ProjectForm;
