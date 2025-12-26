import { useEffect, useMemo, useState } from "react";
import type { SenderIdentity, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppBadge } from "@/ui/AppBadge";

import { fetchSettings, saveSettings } from "@/app/settings/settingsService";
import {
  createSenderIdentity,
  disableSenderIdentity,
  listSenderIdentities,
  resendSenderIdentity,
  sendTestEmail,
  setDefaultSenderIdentity,
} from "@/app/senderIdentities/senderIdentitiesService";
import { trackEvent } from "@/lib/track";

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
  emailDefaultSubject: "Dokument {nummer}",
  emailDefaultText: "Bitte im Anhang finden Sie das Dokument.",
  logoUrl: "",
  primaryColor: "#4f46e5",
  templateId: "default",
  locale: "de-DE",
  currency: "EUR",
  prefixInvoice: "RE",
  prefixOffer: "ANG",
  numberPadding: 4,
  footerText: "",
  defaultSenderIdentityId: null,
};

function toNumberOrFallback(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export default function SettingsView() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "documents" | "branding" | "bank" | "email">("profile");
  const [senderIdentities, setSenderIdentities] = useState<SenderIdentity[]>([]);
  const [senderLoading, setSenderLoading] = useState(true);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderDisplayName, setSenderDisplayName] = useState("");
  const [senderBusyId, setSenderBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!settings.companyName.trim()) w.push("Firmenname fehlt");
    if (!settings.address.trim()) w.push("Adresse fehlt");
    if (!settings.email.trim()) w.push("E-Mail fehlt");
    return w;
  }, [settings]);

  const verifiedIdentities = useMemo(
    () => senderIdentities.filter((identity) => identity.status === "verified"),
    [senderIdentities]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const s = await fetchSettings();
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      setSenderLoading(true);
      try {
        const items = await listSenderIdentities();
        if (mounted) setSenderIdentities(items);
      } catch (e) {
        console.error("Failed to load sender identities:", e);
        if (mounted) setSenderIdentities([]);
      } finally {
        if (mounted) setSenderLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const reloadSenderIdentities = async () => {
    setSenderLoading(true);
    try {
      const items = await listSenderIdentities();
      setSenderIdentities(items);
    } finally {
      setSenderLoading(false);
    }
  };

  const handleCreateSenderIdentity = async () => {
    const email = senderEmail.trim();
    if (!email) {
      alert("Bitte eine E-Mail-Adresse eingeben.");
      return;
    }
    trackEvent("sender_identity_add_started");
    setSenderBusyId("create");
    try {
      await createSenderIdentity({ email, displayName: senderDisplayName.trim() || undefined });
      trackEvent("sender_identity_verification_sent");
      setSenderEmail("");
      setSenderDisplayName("");
      await reloadSenderIdentities();
      alert("Bestaetigungslink wurde gesendet.");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleResend = async (id: string) => {
    setSenderBusyId(id);
    try {
      await resendSenderIdentity(id);
      trackEvent("sender_identity_verification_sent");
      await reloadSenderIdentities();
      alert("Bestaetigungslink erneut gesendet.");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Resend fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleDisable = async (id: string) => {
    if (!confirm("Absenderadresse wirklich deaktivieren?")) return;
    setSenderBusyId(id);
    try {
      await disableSenderIdentity(id);
      await reloadSenderIdentities();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Deaktivieren fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleTestEmail = async (id: string) => {
    setSenderBusyId(id);
    try {
      await sendTestEmail(id);
      trackEvent("sender_identity_test_email_sent");
      alert("Testmail wurde gesendet.");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Testmail fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleDefaultChange = async (value: string) => {
    const next = value || null;
    try {
      await setDefaultSenderIdentity(next);
      setSettings((prev) => ({ ...prev, defaultSenderIdentityId: next }));
      trackEvent("default_sender_identity_updated");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Konnte Standard nicht setzen.");
    }
  };

  const getCooldownSeconds = (lastSent?: string | null) => {
    if (!lastSent) return 0;
    const diffMs = now - new Date(lastSent).getTime();
    const remaining = 60 - Math.floor(diffMs / 1000);
    return remaining > 0 ? remaining : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: UserSettings = {
        ...defaultSettings,
        ...settings,
        defaultVatRate: Math.max(0, toNumberOrFallback(settings.defaultVatRate, 19)),
        defaultPaymentTerms: Math.max(0, Math.trunc(toNumberOrFallback(settings.defaultPaymentTerms, 14))),
        numberPadding: Math.max(1, Math.trunc(settings.numberPadding ?? 4)),
      };

      await saveSettings(payload);
      setSettings(payload);
      alert("Einstellungen gespeichert!");
    } catch (e) {
      console.error("Failed to save settings:", e);
      alert(e instanceof Error ? e.message : "Fehler beim Speichern der Einstellungen.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Lade Einstellungen...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-sm text-gray-600">Branding, Nummernkreise und Firmendaten.</p>
        </div>
        {!!warnings.length && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {warnings.join(" / ")}
          </div>
        )}
      </div>

      <div className="settings-tabs">
        <AppButton
          variant={activeTab === "profile" ? "primary" : "secondary"}
          onClick={() => setActiveTab("profile")}
          className="settings-tab"
        >
          Profil & Firma
        </AppButton>
        <AppButton
          variant={activeTab === "documents" ? "primary" : "secondary"}
          onClick={() => setActiveTab("documents")}
          className="settings-tab"
        >
          Dokumente
        </AppButton>
        <AppButton
          variant={activeTab === "branding" ? "primary" : "secondary"}
          onClick={() => setActiveTab("branding")}
          className="settings-tab"
        >
          Branding
        </AppButton>
        <AppButton
          variant={activeTab === "bank" ? "primary" : "secondary"}
          onClick={() => setActiveTab("bank")}
          className="settings-tab"
        >
          Bank
        </AppButton>
        <AppButton
          variant={activeTab === "email" ? "primary" : "secondary"}
          onClick={() => setActiveTab("email")}
          className="settings-tab"
        >
          E-Mail Versand
        </AppButton>
      </div>

      {activeTab !== "email" && (
        <AppCard className="space-y-4">
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          )}

          {activeTab === "documents" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Standardbetreff E-Mail</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={settings.emailDefaultSubject ?? ""}
                    onChange={(e) => setSettings({ ...settings, emailDefaultSubject: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Standardtext E-Mail</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows={3}
                    value={settings.emailDefaultText ?? ""}
                    onChange={(e) => setSettings({ ...settings, emailDefaultText: e.target.value })}
                  />
                </div>
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

              <h3 className="font-semibold text-gray-900">Locale & Waehrung</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sprache/Region</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={settings.locale ?? "de-DE"}
                    onChange={(e) => setSettings({ ...settings, locale: e.target.value })}
                  >
                    <option value="de-DE">Deutsch (DE)</option>
                    <option value="en-GB">English (UK)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Waehrung</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={settings.currency ?? "EUR"}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  >
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900">Nummernkreise</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Prefix Rechnungen</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={settings.prefixInvoice ?? ""}
                    onChange={(e) => setSettings({ ...settings, prefixInvoice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prefix Angebote</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={settings.prefixOffer ?? ""}
                    onChange={(e) => setSettings({ ...settings, prefixOffer: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Padding</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={settings.numberPadding ?? 4}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        numberPadding: Math.max(1, Math.trunc(Number(e.target.value ?? 4))),
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "branding" && (
            <>
              <h3 className="font-semibold text-gray-900">Branding</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Logo URL</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={settings.logoUrl ?? ""}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Primaerfarbe</label>
                  <input
                    type="color"
                    className="w-24 h-10 border rounded p-1"
                    value={settings.primaryColor ?? "#4f46e5"}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Template</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={settings.templateId ?? "default"}
                    onChange={(e) => setSettings({ ...settings, templateId: e.target.value })}
                  >
                    <option value="default">Default</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Footer (Dokumente)</label>
                  <textarea
                    className="w-full p-2 border rounded"
                    rows={2}
                    value={settings.footerText ?? ""}
                    onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "bank" && (
            <>
              <h3 className="font-semibold text-gray-900">Bankverbindung</h3>

              <div>
                <label className="block text-sm font-medium mb-1">Bankname</label>
                <input
                  className="w-full p-2 border rounded"
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </>
          )}

          <div className="pt-4">
            <AppButton onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Speichere..." : "Einstellungen speichern"}
            </AppButton>
          </div>
        </AppCard>
      )}

      {activeTab === "email" && (
        <AppCard className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">E-Mail Versand</h3>
            <p className="text-sm text-gray-600">
              Verifizierte Reply-To Adressen fuer Rechnungen. Versand erfolgt immer ueber die App-Domain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Absenderadresse</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="name@firma.de"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anzeigename (optional)</label>
              <input
                className="w-full p-2 border rounded"
                value={senderDisplayName}
                onChange={(e) => setSenderDisplayName(e.target.value)}
                placeholder={settings.companyName || "Max Mustermann"}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AppButton
              onClick={() => void handleCreateSenderIdentity()}
              disabled={senderBusyId === "create" || !senderEmail.trim()}
            >
              {senderBusyId === "create" ? "Sende..." : "Verifizieren"}
            </AppButton>
            <div className="text-xs text-gray-500">
              Wir senden einen Bestaetigungslink. Token sind 1x nutzbar und 24h gueltig.
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium mb-1">Standard Reply-To Adresse</label>
            <select
              className="w-full p-2 border rounded"
              value={settings.defaultSenderIdentityId ?? ""}
              onChange={(e) => void handleDefaultChange(e.target.value)}
            >
              <option value="">Keine Auswahl</option>
              {verifiedIdentities.map((identity) => (
                <option key={identity.id} value={identity.id}>
                  {identity.displayName ? `${identity.displayName} <${identity.email}>` : identity.email}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Verknuepfte Absenderadressen</h4>
              {senderLoading && <span className="text-xs text-gray-500">Lade...</span>}
            </div>

            {!senderLoading && senderIdentities.length === 0 && (
              <div className="text-sm text-gray-500">Noch keine Absenderadresse hinterlegt.</div>
            )}

            {senderIdentities.map((identity) => {
              const cooldown = getCooldownSeconds(identity.lastVerificationSentAt);
              const isPending = identity.status === "pending";
              const isVerified = identity.status === "verified";
              const isDisabled = identity.status === "disabled";
              return (
                <div
                  key={identity.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded p-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {identity.displayName ? `${identity.displayName} <${identity.email}>` : identity.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {isPending && <AppBadge color="yellow">Pending</AppBadge>}
                      {isVerified && <AppBadge color="green">Verified</AppBadge>}
                      {isDisabled && <AppBadge color="gray">Disabled</AppBadge>}
                      {identity.lastVerificationSentAt && (
                        <span>Letzter Versand: {new Date(identity.lastVerificationSentAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isPending && (
                      <AppButton
                        variant="secondary"
                        disabled={cooldown > 0 || senderBusyId === identity.id}
                        onClick={() => void handleResend(identity.id)}
                      >
                        {cooldown > 0 ? `Erneut senden (${cooldown}s)` : "Erneut senden"}
                      </AppButton>
                    )}
                    {isVerified && (
                      <AppButton
                        variant="secondary"
                        disabled={senderBusyId === identity.id}
                        onClick={() => void handleTestEmail(identity.id)}
                      >
                        Testmail senden
                      </AppButton>
                    )}
                    {!isDisabled && (
                      <AppButton
                        variant="danger"
                        disabled={senderBusyId === identity.id}
                        onClick={() => void handleDisable(identity.id)}
                      >
                        Deaktivieren
                      </AppButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AppCard>
      )}
    </div>
  );
}
