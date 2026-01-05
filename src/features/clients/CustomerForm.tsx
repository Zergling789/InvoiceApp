import { useEffect, useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";

import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { ActionSheet } from "@/components/ui/ActionSheet";
import BottomActionBar from "@/components/BottomActionBar";

type CustomerFormProps = {
  value: Client;
  initialValue: Client;
  onChange: (next: Client) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isExisting: boolean;
  isBusy?: boolean;
  showHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export function CustomerForm({
  value,
  initialValue,
  onChange,
  onSave,
  onCancel,
  onDelete,
  isExisting,
  isBusy = false,
  showHeader = true,
  onDirtyChange,
}: CustomerFormProps) {
  const [showActions, setShowActions] = useState(false);

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
    <div className="space-y-4 bottom-action-spacer">
      {showHeader && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isExisting ? "Kunde bearbeiten" : "Neuer Kunde"}
            </h2>
            <p className="text-sm text-gray-500">Pflichtfeld: Firma</p>
          </div>
          <div className="flex items-center gap-2">
            {isExisting && onDelete && (
              <AppButton variant="ghost" onClick={() => setShowActions(true)}>
                <MoreVertical size={16} /> Mehr
              </AppButton>
            )}
          </div>
        </div>
      )}

      <ActionSheet
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        title="Kundenaktionen"
        actions={[
          {
            label: "Löschen",
            variant: "danger",
            onSelect: () => {
              setShowActions(false);
              onDelete?.();
            },
          },
        ]}
      />

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-semibold text-gray-700">Kontakt</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma *</label>
            <input
              className="w-full border rounded p-2"
              value={value.companyName}
              onChange={(e) => onChange({ ...value, companyName: e.target.value })}
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
            <input
              className="w-full border rounded p-2"
              value={value.contactPerson}
              onChange={(e) => onChange({ ...value, contactPerson: e.target.value })}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              className="w-full border rounded p-2"
              value={value.email}
              onChange={(e) => onChange({ ...value, email: e.target.value })}
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-semibold text-gray-700">Adresse</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
          />
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h3 className="text-sm font-semibold text-gray-700">Notizen</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
          />
        </div>
      </AppCard>

      <BottomActionBar
        primaryLabel="Speichern"
        onPrimary={onSave}
        primaryDisabled={isBusy}
        loading={isBusy}
        secondaryLabel="Schließen"
        onSecondary={onCancel}
      />
    </div>
  );
}

export default CustomerForm;
