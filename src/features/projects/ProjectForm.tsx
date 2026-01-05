import { useEffect, useMemo } from "react";
import { Save, X } from "lucide-react";

import type { Client, Project } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

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
};

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

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
}: ProjectFormProps) {
  const budgetLabel = value.budgetType === "hourly" ? "Budget (Stunden)" : "Budget (EUR)";
  const budgetHint = value.budgetType === "hourly" ? "Gib die geplanten Stunden an." : "Gib den Festpreis an.";

  const isDirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(initialValue),
    [initialValue, value]
  );

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Neues Projekt</h2>
          <p className="text-sm text-gray-500">Projekt-Einstellungen</p>
        </div>
      )}

      <AppCard className="bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="w-full border rounded p-2"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
            <select
              className="w-full border rounded p-2"
              value={value.clientId}
              onChange={(e) => onChange({ ...value, clientId: e.target.value })}
            >
              <option value="">Wählen...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
            {clients.length === 0 && (
              <div className="text-xs text-gray-500 mt-1">Keine Kunden vorhanden – erst Kunden anlegen.</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget-Typ</label>
            <select
              className="w-full border rounded p-2"
              value={value.budgetType}
              onChange={(e) => onChange({ ...value, budgetType: e.target.value as Project["budgetType"] })}
            >
              <option value="hourly">Stundenbasiert</option>
              <option value="fixed">Festpreis</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={String(value.hourlyRate)}
                onChange={(e) => onChange({ ...value, hourlyRate: toNumber(e.target.value, 0) })}
                disabled={value.budgetType !== "hourly"}
                inputMode="decimal"
              />
              {value.budgetType !== "hourly" && (
                <div className="text-xs text-gray-500 mt-1">Nicht relevant bei Festpreis.</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{budgetLabel}</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={String(value.budgetTotal)}
                onChange={(e) => onChange({ ...value, budgetTotal: toNumber(e.target.value, 0) })}
                inputMode="decimal"
              />
              <div className="text-xs text-gray-500 mt-1">{budgetHint}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded p-2"
              value={value.status}
              onChange={(e) => onChange({ ...value, status: e.target.value as Project["status"] })}
            >
              <option value="active">aktiv</option>
              <option value="completed">abgeschlossen</option>
              <option value="archived">archiviert</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <AppButton
            variant="ghost"
            disabled={saving}
            onClick={onCancel}
          >
            <X size={16} /> Abbrechen
          </AppButton>

          <AppButton disabled={saving} onClick={onSave}>
            <Save size={16} /> {saving ? "Speichere..." : "Speichern"}
          </AppButton>
        </div>
      </AppCard>
    </div>
  );
}

export default ProjectForm;
