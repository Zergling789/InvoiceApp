import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SenderIdentity, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppBadge } from "@/ui/AppBadge";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { supabase } from "@/supabaseClient";

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
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";

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
  isSmallBusiness: false,
  smallBusinessNote: SMALL_BUSINESS_DEFAULT_NOTE,
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
  const { confirm } = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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
        toast.error(e instanceof Error ? e.message : "Fehler beim Laden der Einstellungen.");
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
      toast.error("Bitte eine E-Mail-Adresse eingeben.");
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
      toast.success("Bestaetigungslink wurde gesendet.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
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
      toast.success("Bestaetigungslink erneut gesendet.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Resend fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleDisable = async (id: string) => {
    const ok = await confirm({
      title: "Absenderadresse deaktivieren",
      message: "Absenderadresse wirklich deaktivieren?",
    });
    if (!ok) return;
    setSenderBusyId(id);
    try {
      await disableSenderIdentity(id);
      await reloadSenderIdentities();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Deaktivieren fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleTestEmail = async (id: string) => {
    setSenderBusyId(id);
    try {
      await sendTestEmail(id);
      trackEvent("sender_identity_test_email_sent");
      toast.success("Testmail wurde gesendet.");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Testmail fehlgeschlagen.");
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
      toast.error(e instanceof Error ? e.message : "Konnte Standard nicht setzen.");
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
      toast.success("Einstellungen gespeichert!");
    } catch (e) {
      console.error("Failed to save settings:", e);
      toast.error(e instanceof Error ? e.message : "Fehler beim Speichern der Einstellungen.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: "Abmelden",
      message: "Möchtest du dich wirklich abmelden?",
    });
    if (!ok) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/login", { replace: true });
  };

  if (loading) return <div className="text-sm text-gray-500">Lade Einstellungen...</div>;

  return (
    <div className="space-y-6 bottom-action-spacer">
      {/* Settings follow the same card/grid rhythm as other pages to avoid mismatched spacing, typography, and action placement. */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-sm text-gray-600">Profil, Firmendaten und Dokument-Defaults verwalten.</p>
      </div>

      {!!warnings.length && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          {warnings.join(" / ")}
        </div>
      )}

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Profil & Account</h2>
          <p className="text-sm text-gray-500">Kontaktdaten für dein Profil.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ihr Name</label>
            <input
              className="w-full border rounded p-2"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              className="w-full border rounded p-2"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Firmendaten</h2>
          <p className="text-sm text-gray-500">Angaben, die auf Dokumenten erscheinen.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
            <input
              className="w-full border rounded p-2"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer / USt-ID</label>
            <input
              className="w-full border rounded p-2"
              value={settings.taxId}
              onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Bankverbindung</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bankname</label>
            <input
              className="w-full border rounded p-2"
              value={settings.bankName}
              onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input
                className="w-full border rounded p-2"
                value={settings.iban}
                onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BIC</label>
              <input
                className="w-full border rounded p-2"
                value={settings.bic}
                onChange={(e) => setSettings({ ...settings, bic: e.target.value })}
              />
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Steuern</h2>
          <p className="text-sm text-gray-500">Einstellungen für den Steuerhinweis auf Rechnungen.</p>
        </div>
        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={settings.isSmallBusiness}
              onChange={(e) => setSettings({ ...settings, isSmallBusiness: e.target.checked })}
            />
            <span>
              <span className="font-medium">Kleinunternehmer (§ 19 UStG)</span>
              <span className="block text-xs text-gray-500">
                Aktiviert den Hinweistext und blendet die Umsatzsteuer auf Rechnungen aus.
              </span>
            </span>
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hinweistext (optional)
            </label>
            <textarea
              className="w-full border rounded p-2"
              rows={2}
              value={settings.smallBusinessNote ?? ""}
              onChange={(e) => setSettings({ ...settings, smallBusinessNote: e.target.value })}
              placeholder={SMALL_BUSINESS_DEFAULT_NOTE}
            />
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Dokument-Defaults</h2>
          <p className="text-sm text-gray-500">Standardwerte für Angebote und Rechnungen.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standardbetreff E-Mail</label>
            <input
              className="w-full border rounded p-2"
              value={settings.emailDefaultSubject ?? ""}
              onChange={(e) => setSettings({ ...settings, emailDefaultSubject: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Standardtext E-Mail</label>
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              value={settings.emailDefaultText ?? ""}
              onChange={(e) => setSettings({ ...settings, emailDefaultText: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Standard MwSt (%)</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              value={settings.defaultVatRate}
              onChange={(e) =>
                setSettings({ ...settings, defaultVatRate: toNumberOrFallback(e.target.value, 19) })
              }
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsziel (Tage)</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              value={settings.defaultPaymentTerms}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultPaymentTerms: Math.max(0, Math.trunc(toNumberOrFallback(e.target.value, 14))),
                })
              }
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Locale & Währung</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprache/Region</label>
              <select
                className="w-full border rounded p-2"
                value={settings.locale ?? "de-DE"}
                onChange={(e) => setSettings({ ...settings, locale: e.target.value })}
              >
                <option value="de-DE">Deutsch (DE)</option>
                <option value="en-GB">English (UK)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Währung</label>
              <select
                className="w-full border rounded p-2"
                value={settings.currency ?? "EUR"}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              >
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Nummernkreise</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefix Rechnungen</label>
              <input
                className="w-full border rounded p-2"
                value={settings.prefixInvoice ?? ""}
                onChange={(e) => setSettings({ ...settings, prefixInvoice: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prefix Angebote</label>
              <input
                className="w-full border rounded p-2"
                value={settings.prefixOffer ?? ""}
                onChange={(e) => setSettings({ ...settings, prefixOffer: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Padding</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={settings.numberPadding ?? 4}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    numberPadding: Math.max(1, Math.trunc(Number(e.target.value ?? 4))),
                  })
                }
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Branding</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                className="w-full border rounded p-2"
                value={settings.logoUrl ?? ""}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primärfarbe</label>
              <input
                type="color"
                className="w-24 h-10 border rounded p-1"
                value={settings.primaryColor ?? "#4f46e5"}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                className="w-full border rounded p-2"
                value={settings.templateId ?? "default"}
                onChange={(e) => setSettings({ ...settings, templateId: e.target.value })}
              >
                <option value="default">Default</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Footer (Dokumente)</label>
              <textarea
                className="w-full border rounded p-2"
                rows={2}
                value={settings.footerText ?? ""}
                onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              />
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">E-Mail Versand</h2>
          <p className="text-sm text-gray-500">
            Verifizierte Reply-To Adressen für Rechnungen. Versand erfolgt immer über die App-Domain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Absenderadresse</label>
            <input
              type="email"
              className="w-full border rounded p-2"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="name@firma.de"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename (optional)</label>
            <input
              className="w-full border rounded p-2"
              value={senderDisplayName}
              onChange={(e) => setSenderDisplayName(e.target.value)}
              placeholder={settings.companyName || "Max Mustermann"}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <AppButton
            onClick={() => void handleCreateSenderIdentity()}
            disabled={senderBusyId === "create" || !senderEmail.trim()}
          >
            {senderBusyId === "create" ? "Sende..." : "Verifizieren"}
          </AppButton>
          <div className="text-xs text-gray-500">
            Wir senden einen Bestätigungslink. Token sind 1x nutzbar und 24h gültig.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Standard Reply-To Adresse</label>
          <select
            className="w-full border rounded p-2"
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
            <h3 className="text-sm font-semibold text-gray-700">Verknüpfte Absenderadressen</h3>
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
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
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

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Danger Zone</h2>
          <p className="text-sm text-gray-500">Sensible Aktionen für deinen Account.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">Du wirst sofort aus der App abgemeldet.</div>
          <AppButton variant="danger" onClick={() => void handleSignOut()} disabled={signingOut}>
            {signingOut ? "Abmelden..." : "Abmelden"}
          </AppButton>
        </div>
      </AppCard>

      <div className="bottom-action-bar safe-area-container">
        <div className="app-container">
          <div className="flex justify-end">
            <AppButton onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Speichere..." : "Einstellungen speichern"}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
