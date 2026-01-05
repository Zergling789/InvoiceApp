// src/features/clients/Clients.tsx
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { useClients, useDeleteClient, useSaveClient } from "@/app/clients/clientQueries";
import CustomerForm from "@/features/clients/CustomerForm";

export default function Clients() {
  const { clients, loading, error, refresh } = useClients();
  const { confirm } = useConfirm();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { save, saving } = useSaveClient(refresh);
  const { remove, deleting } = useDeleteClient(refresh);

  const [editing, setEditing] = useState<Client | null>(null);
  const [editingInitial, setEditingInitial] = useState<Client | null>(null);

  const startNew = () => {
    navigate("/app/customers/new", { state: { backgroundLocation: location } });
  };
  const startEdit = (c: Client) => {
    setEditing({ ...c });
    setEditingInitial({ ...c });
  };

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

      {editing && editingInitial && (
        <div className="space-y-4 bottom-action-spacer">
          <CustomerForm
            value={editing}
            initialValue={editingInitial}
            onChange={setEditing}
            onSave={saveClient}
            onCancel={cancel}
            onDelete={async () => {
              await deleteClient(editing.id);
              setEditing(null);
            }}
            isExisting={isExisting}
            isBusy={isBusy}
          />
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
