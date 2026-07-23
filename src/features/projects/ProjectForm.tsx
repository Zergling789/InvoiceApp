import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Save, X } from "lucide-react";

import { getClientDisplayName } from "@/domain/models/Client";
import { PROJECT_PRIORITY_LABELS, PROJECT_PRIORITIES, PROJECT_TYPES } from "@/domain/projects";
import type { Client, ProjectPriority } from "@/types";
import { formatMoney } from "@/utils/money";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppNumberInput } from "@/ui/AppNumberInput";

export type DraftProject = {
  customerId?: string;
  title: string;
  description?: string;
  projectType?: string;
  source?: string;
  priority: ProjectPriority;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  estimatedValue?: number;
  startDate?: string;
  targetEndDate?: string;
  assignedUserId?: string;
};

type Props = {
  value: DraftProject;
  initialValue: DraftProject;
  clients: Client[];
  onChange: (value: DraftProject) => void;
  onSave: () => void;
  onCancel: () => void;
  onCreateClient?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  saving?: boolean;
};

const steps = ["Kunde", "Projekt", "Projektort", "Planung", "Zusammenfassung"] as const;
const inputClass = "app-input mt-1 w-full";

export default function ProjectForm({
  value,
  initialValue,
  clients,
  onChange,
  onSave,
  onCancel,
  onCreateClient,
  onDirtyChange,
  saving = false,
}: Props) {
  const [step, setStep] = useState(0);
  const selectedClient = clients.find((client) => client.id === value.customerId);
  const dirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(initialValue), [initialValue, value]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const canContinue = step !== 1 || Boolean(value.title.trim());
  const copyCustomerAddress = () => {
    if (!selectedClient) return;
    onChange({
      ...value,
      addressLine1:
        [selectedClient.street, selectedClient.houseNumber].filter(Boolean).join(" ") ||
        selectedClient.address ||
        "",
      addressLine2: selectedClient.addressAddition || "",
      postalCode: selectedClient.postalCode || "",
      city: selectedClient.city || "",
      country: selectedClient.country || "Deutschland",
    });
  };

  return (
    <div className="space-y-5">
      <nav aria-label="Fortschritt Projekterstellung">
        <div className="rounded-xl border border-[var(--app-border)] p-3 sm:hidden">
          <div className="flex justify-between text-sm"><strong>Schritt {step + 1} von {steps.length}</strong><span>{steps[step]}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full bg-[var(--app-primary)]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        </div>
        <ol className="hidden grid-cols-5 gap-2 sm:grid">{steps.map((label, index) => <li key={label}><button type="button" disabled={index > step || saving} onClick={() => setStep(index)} className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 text-left text-xs ${index === step ? "border-[var(--app-primary)] bg-blue-500/10 text-[var(--app-primary)]" : index < step ? "border-green-500/30 bg-green-500/10" : "border-[var(--app-border)] text-[var(--app-muted)]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${index <= step ? "bg-[var(--app-primary)] text-white" : "bg-black/5"}`}>{index < step ? <Check size={14} /> : index + 1}</span>{label}</button></li>)}</ol>
      </nav>

      <AppCard className="p-5 sm:p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div><div className="app-eyebrow">Schritt 1</div><h2 className="mt-1 text-xl font-semibold">Kunde zuordnen</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Du kannst das Projekt auch zunächst ohne Kunden anlegen.</p></div>
            <label className="block text-sm font-medium">Bestehender Kunde<select aria-label="Kunde" className={inputClass} value={value.customerId ?? ""} onChange={(event) => onChange({ ...value, customerId: event.target.value || undefined })}><option value="">Noch kein Kunde</option>{clients.map((client) => <option key={client.id} value={client.id}>{getClientDisplayName(client)}</option>)}</select></label>
            {onCreateClient && <AppButton variant="secondary" onClick={onCreateClient}><Plus size={16} /> Neuen Kunden anlegen</AppButton>}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div><div className="app-eyebrow">Schritt 2</div><h2 className="mt-1 text-xl font-semibold">Projektinformationen</h2></div>
            <label className="block text-sm font-medium">Projekttitel *<input aria-label="Projekttitel" className={inputClass} value={value.title} maxLength={180} onChange={(event) => onChange({ ...value, title: event.target.value })} placeholder="Terrasse Müller" autoFocus /></label>
            <label className="block text-sm font-medium">Kurze Beschreibung<textarea className={`${inputClass} min-h-24`} maxLength={5000} value={value.description ?? ""} onChange={(event) => onChange({ ...value, description: event.target.value })} /></label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">Projektart<select className={inputClass} value={value.projectType ?? ""} onChange={(event) => onChange({ ...value, projectType: event.target.value || undefined })}><option value="">Nicht festgelegt</option>{PROJECT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
              <label className="text-sm font-medium">Quelle der Anfrage<input className={inputClass} maxLength={120} value={value.source ?? ""} onChange={(event) => onChange({ ...value, source: event.target.value })} placeholder="Empfehlung, Website …" /></label>
              <label className="text-sm font-medium">Priorität<select className={inputClass} value={value.priority} onChange={(event) => onChange({ ...value, priority: event.target.value as ProjectPriority })}>{PROJECT_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PROJECT_PRIORITY_LABELS[priority]}</option>)}</select></label>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="app-eyebrow">Schritt 3</div><h2 className="mt-1 text-xl font-semibold">Projektort</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Alle Angaben sind optional.</p></div>{selectedClient && <AppButton variant="secondary" onClick={copyCustomerAddress}>Kundenadresse übernehmen</AppButton>}</div>
            <label className="block text-sm font-medium">Straße und Hausnummer<input className={inputClass} value={value.addressLine1 ?? ""} onChange={(event) => onChange({ ...value, addressLine1: event.target.value })} /></label>
            <label className="block text-sm font-medium">Adresszusatz<input className={inputClass} value={value.addressLine2 ?? ""} onChange={(event) => onChange({ ...value, addressLine2: event.target.value })} /></label>
            <div className="grid gap-4 sm:grid-cols-[140px_1fr_1fr]"><label className="text-sm font-medium">PLZ<input className={inputClass} value={value.postalCode ?? ""} onChange={(event) => onChange({ ...value, postalCode: event.target.value })} /></label><label className="text-sm font-medium">Ort<input className={inputClass} value={value.city ?? ""} onChange={(event) => onChange({ ...value, city: event.target.value })} /></label><label className="text-sm font-medium">Land<input className={inputClass} value={value.country ?? ""} onChange={(event) => onChange({ ...value, country: event.target.value })} /></label></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div><div className="app-eyebrow">Schritt 4</div><h2 className="mt-1 text-xl font-semibold">Planung</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Kann später ergänzt werden.</p></div>
            <label className="block max-w-sm text-sm font-medium">Geschätzter Projektwert<AppNumberInput className={`${inputClass} pr-10`} value={value.estimatedValue ?? 0} min={0} step="any" suffix="€" onValueChange={(estimatedValue) => onChange({ ...value, estimatedValue: estimatedValue || undefined })} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Gewünschter Start<input type="date" className={inputClass} value={value.startDate ?? ""} onChange={(event) => onChange({ ...value, startDate: event.target.value || undefined })} /></label><label className="text-sm font-medium">Gewünschte Fertigstellung<input type="date" className={inputClass} min={value.startDate} value={value.targetEndDate ?? ""} onChange={(event) => onChange({ ...value, targetEndDate: event.target.value || undefined })} /></label></div>
            <p className="text-sm text-[var(--app-muted)]">Eine zuständige Person kann in diesem persönlichen Arbeitsbereich später ergänzt werden.</p>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-5">
            <div><div className="app-eyebrow">Schritt 5</div><h2 className="mt-1 text-xl font-semibold">Zusammenfassung</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Das Projekt startet in der Phase „Anfrage“.</p></div>
            <dl className="grid gap-4 rounded-xl bg-black/[0.025] p-4 text-sm sm:grid-cols-2 dark:bg-white/[0.04]"><div><dt className="text-[var(--app-muted)]">Kunde</dt><dd className="mt-1 font-semibold">{selectedClient ? getClientDisplayName(selectedClient) : "Noch kein Kunde"}</dd></div><div><dt className="text-[var(--app-muted)]">Projekt</dt><dd className="mt-1 font-semibold">{value.title}</dd></div><div><dt className="text-[var(--app-muted)]">Ort</dt><dd className="mt-1 font-semibold">{[value.addressLine1, value.postalCode, value.city].filter(Boolean).join(", ") || "Nicht angegeben"}</dd></div><div><dt className="text-[var(--app-muted)]">Planung</dt><dd className="mt-1 font-semibold">{value.estimatedValue ? formatMoney(value.estimatedValue, "EUR", "de-DE") : "Noch ohne Projektwert"}</dd></div><div><dt className="text-[var(--app-muted)]">Priorität</dt><dd className="mt-1 font-semibold">{PROJECT_PRIORITY_LABELS[value.priority]}</dd></div><div><dt className="text-[var(--app-muted)]">Initiale Phase</dt><dd className="mt-1 font-semibold">Anfrage</dd></div></dl>
          </div>
        )}
      </AppCard>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div>{step === 0 ? <AppButton variant="ghost" disabled={saving} onClick={onCancel}><X size={16} /> Abbrechen</AppButton> : <AppButton variant="secondary" disabled={saving} onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16} /> Zurück</AppButton>}</div>
        {step < steps.length - 1 ? <AppButton disabled={!canContinue || saving} onClick={() => setStep((current) => current + 1)}>Weiter <ArrowRight size={16} /></AppButton> : <AppButton disabled={!value.title.trim() || saving} onClick={onSave}><Save size={16} /> {saving ? "Wird erstellt …" : "Projekt erstellen"}</AppButton>}
      </div>
    </div>
  );
}

