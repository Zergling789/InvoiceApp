import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import * as clientService from "@/app/clients/clientService";
import CustomerForm from "@/features/clients/CustomerForm";
import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";

export default function CustomerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [client, setClient] = useState<Client | null>(null);
  const [initialClient, setInitialClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) { setLoadError(true); setLoading(false); return; }
      setLoading(true);
      setLoadError(false);
      try {
        const result = await clientService.get(id);
        if (!active) return;
        setClient(result);
        setInitialClient(result);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id]);

  const save = async () => {
    if (!client) return;
    const firstName = client.firstName?.trim() ?? "";
    const lastName = client.lastName?.trim() ?? "";
    if (!firstName || !lastName) { toast.error("Vorname und Nachname sind erforderlich."); return; }
    setSaving(true);
    try {
      await clientService.saveClient({ ...client, companyName: client.companyName.trim(), firstName, lastName, contactPerson: `${firstName} ${lastName}` });
      toast.success("Kunde gespeichert.");
      navigate("/app/clients");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde konnte nicht gespeichert werden.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!client) return;
    const confirmed = await confirm({ title: "Kunde löschen", message: "Möchtest du diesen Kunden wirklich löschen? Zugehörige Dokumente bleiben erhalten." });
    if (!confirmed) return;
    setSaving(true);
    try { await clientService.removeClient(client.id); toast.success("Kunde gelöscht."); navigate("/app/clients"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Kunde konnte nicht gelöscht werden."); setSaving(false); }
  };

  if (loading) return <AppCard className="p-6 text-sm text-[var(--app-muted)]">Kunde wird geladen …</AppCard>;
  if (loadError || !client || !initialClient) return <AppCard className="p-6"><h1 className="font-semibold">Kunde konnte nicht geöffnet werden</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Der Datensatz ist nicht mehr verfügbar oder die Verbindung wurde unterbrochen.</p><AppButton className="mt-4" onClick={() => navigate("/app/clients")}>Zur Kundenübersicht</AppButton></AppCard>;

  return <CustomerForm value={client} initialValue={initialClient} onChange={setClient} onSave={save} onCancel={() => navigate("/app/clients")} onDelete={remove} isExisting isBusy={saving} />;
}
