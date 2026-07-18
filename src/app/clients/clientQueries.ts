import { useCallback, useEffect, useState } from "react";
import type { Client } from "@/domain/types";
import type { ClientSummary } from "@/domain/models/Client";
import * as clientService from "./clientService";
import { useCursorPages } from "@/app/shared/useCursorPages";

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

export function useClientPages(search: string) {
  const loadPage = useCallback(
    (options: Parameters<typeof clientService.listPage>[0]) =>
      clientService.listPage({ ...options, search }),
    [search],
  );
  const pages = useCursorPages(loadPage);
  return { ...pages, clients: pages.items };
}

export function useClientSummaries() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClients(await clientService.listSummaries());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
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
