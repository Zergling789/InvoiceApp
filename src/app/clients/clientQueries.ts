import { useCallback, useEffect, useState } from "react";
import type { Client } from "@/domain/types";
import * as clientService from "./clientService";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await clientService.list();
      setClients(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { clients, loading, error, refresh };
}

export function useSaveClient(onSaved?: () => Promise<void> | void) {
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (client: Client) => {
      setSaving(true);
      try {
        await clientService.upsert(client);
        if (onSaved) await onSaved();
      } finally {
        setSaving(false);
      }
    },
    [onSaved]
  );

  return { save, saving };
}

export function useDeleteClient(onDeleted?: () => Promise<void> | void) {
  const [deleting, setDeleting] = useState(false);

  const remove = useCallback(
    async (id: string) => {
      setDeleting(true);
      try {
        await clientService.remove(id);
        if (onDeleted) await onDeleted();
      } finally {
        setDeleting(false);
      }
    },
    [onDeleted]
  );

  return { remove, deleting };
}
