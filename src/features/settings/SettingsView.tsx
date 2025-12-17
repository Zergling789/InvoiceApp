// src/features/settings/SettingsView.tsx
import { useEffect, useState } from "react";
import { Save, RefreshCcw } from "lucide-react";

import type { UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { dbGetSettings, dbSaveSettings } from "@/db/settingsDb";

function toNumber(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export default function SettingsView() {
  const [form, setForm] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await dbGetSettings();
      setForm(settings);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form) return;

    if (!form.companyName.trim()) {
      alert("Bitte Firmennamen eintragen.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await dbSaveSettings({
        ...form,
        companyName: form.companyName.trim(),
        name: form.name?.trim() ?? "",
        address: form.address ?? "",
        taxId: form.taxId ?? "",
        defaultVatRate: toNumber(form.defaultVatRate, 0),
        defaultPaymentTerms: Math.max(0, Math.round(toNumber(form.defaultPaymentTerms, 14))),
        iban: form.iban ?? "",
        bic: form.bic ?? "",
        bankName: form.bankName ?? "",
        email: form.email ?? "",
      });
      setSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Lade Einstellungen…</div>;
  }

  if (!form) {
    return (
      <div className="space-y-4">
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error ?? "Einstellungen konnten nicht geladen werden."}
        </div>
        <AppButton onClick={() => void load()} variant="secondary">
          <RefreshCcw size={16} /> Erneut versuchen
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-600">
            Stammdaten für Dokumente (werden in Angeboten/Rechnungen verwendet).
          </p>
        </div>
        <div className="flex gap-2">
          <AppButton variant="secondary" onClick={() => void load()} disabled={saving}>
            <RefreshCcw size={16} /> Neu laden
          </AppButton>
          <AppButton onClick={() => void save()} disabled={saving}>
            <Save size={16} /> {saving ? "Speichere…" : "Speichern"}
          </AppButton>
        </div>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}

      {savedAt && !error && (
        <div className="text-green-700 bg-green-50 border border-green-200 rounded p-3">
          Gespeichert um {savedAt.toLocaleTimeString()}.
        </div>
      )}

      <AppCard className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dein Name</label>
            <input
              className="w-full border rounded p-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname *</label>
            <input
              className="w-full border rounded p-2"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              className="w-full border rounded p-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Steuer-ID / USt-ID</label>
            <input
              className="w-full border rounded p-2"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard MwSt (%)</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              value={form.defaultVatRate}
              onChange={(e) => setForm({ ...form, defaultVatRate: toNumber(e.target.value, 0) })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsziel (Tage)</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              value={form.defaultPaymentTerms}
              onChange={(e) =>
                setForm({ ...form, defaultPaymentTerms: toNumber(e.target.value, 14) })
              }
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bankname</label>
            <input
              className="w-full border rounded p-2"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
            <input
              className="w-full border rounded p-2"
              value={form.iban}
              onChange={(e) => setForm({ ...form, iban: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BIC</label>
            <input
              className="w-full border rounded p-2"
              value={form.bic}
              onChange={(e) => setForm({ ...form, bic: e.target.value })}
            />
          </div>
        </div>
      </AppCard>
    </div>
  );
}
