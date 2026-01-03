// src/features/clients/Clients.tsx
import { useMemo, useState } from "react";
import { MoreVertical, Plus, Save, Trash2 } from "lucide-react";

import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { createEmptyClient } from "@/app/clients/clientService";
import { useClients, useDeleteClient, useSaveClient } from "@/app/clients/clientQueries";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export default function Clients() {
  const { clients, loading, error, refresh } = useClients();
  const { confirm } = useConfirm();
  const toast = useToast();
  const { save, saving } = useSaveClient(refresh);
  const { remove, deleting } = useDeleteClient(refresh);

  const [editing, setEditing] = useState<Client | null>(null);
  const [showActions, setShowActions] = useState(false);

  const startNew = () => setEditing(createEmptyClient(newId()));
  const startEdit = (c: Client) => setEditing({ ...c });

  const cancel = () => setEditing(null);

  const saveClient = async () => {
    if (!editing) return;
    const name = editing.companyName.trim();
    if (!name) {
      toast.error("Firmenname fehlt.");
      return;
    }

    await save({
      ...editing,
      companyName: name,
      contactPerson: editing.contactPerson ?? "",
      email: editing.email ?? "",
      address: editing.address ?? "",
      notes: editing.notes ?? "",
    });
    setEditing(null);
    await refresh();
  };

  const deleteClient = async (id: string) => {
    const ok = await confirm({
      title: "Kunde loeschen",
      message: "Wirklich loeschen?",
    });
    if (!ok) return;
    await remove(id);
    await refresh();
  };

  const isBusy = useMemo(() => saving || deleting, [saving, deleting]);
  const isExisting = useMemo(
    () => (editing ? clients.some((client) => client.id === editing.id) : false),
    [clients, editing]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
        <AppButton onClick={startNew} className="w-full sm:w-auto justify-center">
          <Plus size={16} /> Neuer Kunde
        </AppButton>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">{error}</div>
      )}

      {editing && (
        <div className="space-y-4 bottom-action-spacer">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isExisting ? "Kunde bearbeiten" : "Neuer Kunde"}
              </h2>
              <p className="text-sm text-gray-500">Pflichtfeld: Firma</p>
            </div>
            <div className="flex items-center gap-2">
              {isExisting && (
                <AppButton variant="ghost" onClick={() => setShowActions(true)}>
                  <MoreVertical size={16} /> Mehr
                </AppButton>
              )}
            </div>
          </div>

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
                  void deleteClient(editing.id);
                  setEditing(null);
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
                  value={editing.companyName}
                  onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
                  autoComplete="organization"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
                <input
                  className="w-full border rounded p-2"
                  value={editing.contactPerson}
                  onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  className="w-full border rounded p-2"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
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
                value={editing.address}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
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
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>
          </AppCard>

          <div className="bottom-action-bar safe-area-container">
            <div className="flex flex-wrap gap-2">
              <AppButton variant="secondary" onClick={cancel} disabled={isBusy} className="flex-1 justify-center">
                Abbrechen
              </AppButton>
              <AppButton onClick={saveClient} disabled={isBusy} className="flex-1 justify-center">
                <Save size={16} /> {saving ? "Speichere..." : "Speichern"}
              </AppButton>
            </div>
          </div>
        </div>
      )}

      <AppCard>
        {loading ? (
          <div className="text-gray-500">Lade...</div>
        ) : clients.length === 0 ? (
          <div className="text-gray-500">Noch keine Kunden.</div>
        ) : (
          <div className="divide-y">
            {clients.map((c) => (
              <div key={c.id} className="py-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{c.companyName}</div>
                  <div className="text-sm text-gray-600">
                    {c.contactPerson ? `${c.contactPerson} · ` : ""}
                    {c.email || "—"}
                  </div>
                  {c.address && <div className="text-sm text-gray-500 whitespace-pre-line">{c.address}</div>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <AppButton variant="secondary" onClick={() => startEdit(c)}>
                    Bearbeiten
                  </AppButton>
                  <AppButton variant="danger" onClick={() => deleteClient(c.id)} disabled={isBusy}>
                    <Trash2 size={16} /> Löschen
                  </AppButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
