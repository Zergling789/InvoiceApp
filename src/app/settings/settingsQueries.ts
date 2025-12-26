import { useCallback, useEffect, useState } from "react";
import type { UserSettings } from "@/domain/types";
import * as settingsService from "./settingsService";

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await settingsService.loadSettings();
      setSettings(loaded);
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

  return { settings, loading, error, refresh, setSettings };
}
