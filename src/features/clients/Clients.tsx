// src/features/clients/Clients.tsx
import { useMemo, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";

import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { createEmptyClient } from "@/app/clients/clientService";
import { useClients, useDeleteClient, useSaveClient } from "@/app/clients/clientQueries";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;

export default function Clients() {
  const { clients, loading, error, refresh } = useClients();
  const { save, saving } = useSaveClient(refresh);
  const { remove, deleting } = useDeleteClient(refresh);

  const [editing, setEditing] = useState<Client | null>(null);

  const startNew = () => setEditing(createEmptyClient(newId()));
  const startEdit = (c: Client) => setEditing({ ...c });

  const cancel = () => setEditing(null);

  const saveClient = async () => {
    if (!editing) return;
    const name = editing.companyName.trim();
    if (!name) return alert("Firmenname fehlt.");

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
    if (!confirm("Wirklich löschen?")) return;
    await remove(id);
    await refresh();
  };

  const isBusy = useMemo(() => saving || deleting, [saving, deleting]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
        <AppButton onClick={startNew}>
          <Plus size={16} /> Neuer Kunde
        </AppButton>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">{error}</div>
      )}

      {editing && (
        <AppCard className="bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firma *</label>
              <input
                className="w-full border rounded p-2"
                value={editing.companyName}
                onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktperson</label>
              <input
                className="w-full border rounded p-2"
                value={editing.contactPerson}
                onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                className="w-full border rounded p-2"
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <AppButton variant="ghost" onClick={cancel} disabled={isBusy}>
              <X size={16} /> Abbrechen
            </AppButton>
            <AppButton onClick={saveClient} disabled={isBusy}>
              <Save size={16} /> {saving ? "Speichere..." : "Speichern"}
            </AppButton>
          </div>
        </AppCard>
      )}

      <AppCard>
        {loading ? (
          <div className="text-gray-500">Lade...</div>
        ) : clients.length === 0 ? (
          <div className="text-gray-500">Noch keine Kunden.</div>
        ) : (
          <div className="divide-y">
            {clients.map((c) => (
              <div key={c.id} className="py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{c.companyName}</div>
                  <div className="text-sm text-gray-600">
                    {c.contactPerson ? `${c.contactPerson} · ` : ""}
                    {c.email || "—"}
                  </div>
                  {c.address && <div className="text-sm text-gray-500 whitespace-pre-line">{c.address}</div>}
                </div>

                <div className="flex gap-2">
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
