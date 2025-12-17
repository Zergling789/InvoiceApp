// src/features/settings/SettingsView.tsx
import { useEffect, useMemo, useState } from "react";
import type { UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

import { dbGetSettings, dbSaveSettings } from "@/db/settingsDb";

const defaultSettings: UserSettings = {
  name: "",
  companyName: "",
  address: "",
  taxId: "",
  defaultVatRate: 19,
  defaultPaymentTerms: 14,
  iban: "",
  bic: "",
  bankName: "",
  email: "",
};

function toNumberOrFallback(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function SettingsView() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Kleine “Health”-Checks fürs UI (optional, aber praktisch)
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!settings.companyName.trim()) w.push("Firmenname fehlt");
    if (!settings.address.trim()) w.push("Adresse fehlt");
    if (!settings.email.trim()) w.push("E-Mail fehlt");
    return w;
  }, [settings]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await dbGetSettings();
        // ✅ robust: null/undefined + fehlende Felder abfangen
        setSettings({ ...defaultSettings, ...(s ?? {}) });
      } catch (e) {
        console.error("Failed to load settings:", e);
        alert(e instanceof Error ? e.message : "Fehler beim Laden der Einstellungen.");
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // ✅ normalize: niemals undefined speichern
      const payload: UserSettings = {
        ...defaultSettings,
        ...settings,
        defaultVatRate: Math.max(0, toNumberOrFallback(settings.defaultVatRate, 19)),
        defaultPaymentTerms: Math.max(0, Math.trunc(toNumberOrFallback(settings.defaultPaymentTerms, 14))),
      };

      await dbSaveSettings(payload);
      setSettings(payload);
      alert("Einstellungen gespeichert!");
    } catch (e) {
      console.error("Failed to save settings:", e);
      alert(e instanceof Error ? e.message : "Fehler beim Speichern der Einstellungen.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Lade Einstellungen…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        {warnings.length > 0 && (
          <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            <div className="font-medium mb-1">Hinweis</div>
            <ul className="list-disc pl-5">
              {warnings.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <AppCard className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ihr Name</label>
          <input
            className="w-full p-2 border rounded"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Firmenname</label>
          <input
            className="w-full p-2 border rounded"
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">E-Mail</label>
          <input
            type="email"
            className="w-full p-2 border rounded"
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Adresse</label>
          <textarea
            className="w-full p-2 border rounded"
            rows={3}
            value={settings.address}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Steuernummer / USt-ID</label>
          <input
            className="w-full p-2 border rounded"
            value={settings.taxId}
            onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Standard MwSt (%)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={settings.defaultVatRate}
              onChange={(e) =>
                setSettings({ ...settings, defaultVatRate: toNumberOrFallback(e.target.value, 19) })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Zahlungsziel (Tage)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={settings.defaultPaymentTerms}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultPaymentTerms: Math.max(0, Math.trunc(toNumberOrFallback(e.target.value, 14))),
                })
              }
            />
          </div>
        </div>

        <hr className="my-4" />

        <h3 className="font-semibold text-gray-900">Bankverbindung</h3>

        <div>
          <label className="block text-sm font-medium mb-1">Bankname</label>
          <input
            className="w-full p-2 border rounded"
            value={settings.bankName}
            onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">IBAN</label>
            <input
              className="w-full p-2 border rounded"
              value={settings.iban}
              onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">BIC</label>
            <input
              className="w-full p-2 border rounded"
              value={settings.bic}
              onChange={(e) => setSettings({ ...settings, bic: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-4">
          <AppButton onClick={handleSave} disabled={saving}>
            {saving ? "Speichere…" : "Einstellungen speichern"}
          </AppButton>
        </div>
      </AppCard>
    </div>
  );
}

export default SettingsView;
