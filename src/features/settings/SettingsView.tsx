import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SenderIdentity, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppBadge } from "@/ui/AppBadge";
import { AppNumberInput } from "@/ui/AppNumberInput";
import { useConfirm, useToast } from "@/ui/FeedbackProvider";
import { supabase } from "@/supabaseClient";

import { fetchSettings, saveSettings } from "@/app/settings/settingsService";
import { trackEvent } from "@/lib/track";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";
import type { AccountDeletionRequest } from "@/app/account/accountDataService";
import { logError } from "@/utils/errors";

const BrandingSettingsSection = lazy(() =>
  import("@/features/settings/BrandingSettingsSection").then((module) => ({
    default: module.BrandingSettingsSection,
  })),
);
const loadSenderIdentityService = () =>
  import("@/app/senderIdentities/senderIdentitiesService");
const loadAccountDataService = () => import("@/app/account/accountDataService");

const SETTINGS_SECTIONS = [
  { id: "company", label: "Firma & Steuer" },
  { id: "documents", label: "Dokumente" },
  { id: "email", label: "E-Mail" },
  { id: "account", label: "Konto & Datenschutz" },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

const defaultSettings: UserSettings = {
  name: "",
  companyName: "",
  address: "",
  taxId: "",
  sellerTaxNumber: "",
  sellerVatId: "",
  sellerCountry: "DE",
  sellerStreet: "", sellerHouseNumber: "", sellerPostalCode: "", sellerCity: "", sellerElectronicAddress: "", sellerElectronicAddressScheme: "EM",
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

const PAYMENT_TERMS_OPTIONS = [0, 7, 14, 30, 60] as const;

function toNumberOrFallback(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function clampPaymentTerms(value: unknown) {
  return Math.min(365, Math.max(0, Math.trunc(toNumberOrFallback(value, 14))));
}

function formatDeletionStatus(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: "Beantragt",
    COOLING_OFF: "In der Widerrufsfrist",
    CLAIMED: "Zur Bearbeitung vorgemerkt",
    PROCESSING: "Wird bearbeitet",
    BLOCKED_PENDING_REVIEW: "Wird manuell geprüft",
    CANCELED: "Widerrufen",
    COMPLETED: "Abgeschlossen",
  };
  return labels[status] ?? "Wird geprüft";
}

export default function SettingsView() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const { confirm } = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("company");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [senderIdentities, setSenderIdentities] = useState<SenderIdentity[]>([]);
  const [senderLoading, setSenderLoading] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderDisplayName, setSenderDisplayName] = useState("");
  const [senderBusyId, setSenderBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [accountAction, setAccountAction] = useState<"export" | "delete" | null>(null);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionRequest | null>(null);
  const senderIdentitiesRequestedRef = useRef(false);
  const deletionStatusRequestedRef = useRef(false);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (!settings.companyName.trim()) w.push("Firmenname fehlt");
    if (!settings.address.trim()) w.push("Adresse fehlt");
    if (!settings.email.trim()) w.push("E-Mail fehlt");
    return w;
  }, [settings]);

  const paymentTermsPreset = useMemo(() => {
    const normalized = clampPaymentTerms(settings.defaultPaymentTerms);
    return PAYMENT_TERMS_OPTIONS.includes(normalized as (typeof PAYMENT_TERMS_OPTIONS)[number])
      ? String(normalized)
      : "custom";
  }, [settings.defaultPaymentTerms]);

  const verifiedIdentities = useMemo(
    () => senderIdentities.filter((identity) => identity.status === "verified"),
    [senderIdentities]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const s = await fetchSettings();
        setSettings({ ...defaultSettings, ...(s ?? {}) });
      } catch (e) {
        logError(e);
        toast.error(e instanceof Error ? e.message : "Fehler beim Laden der Einstellungen.");
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadToken]);

  useEffect(() => {
    if (activeSection !== "email" || senderIdentitiesRequestedRef.current) return;
    senderIdentitiesRequestedRef.current = true;
    let mounted = true;
    let completed = false;
    (async () => {
      setSenderLoading(true);
      try {
        const { listSenderIdentities } = await loadSenderIdentityService();
        const items = await listSenderIdentities();
        if (mounted) setSenderIdentities(items);
      } catch (e) {
        logError(e);
        senderIdentitiesRequestedRef.current = false;
        if (mounted) setSenderIdentities([]);
      } finally {
        completed = true;
        if (mounted) setSenderLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (!completed) senderIdentitiesRequestedRef.current = false;
    };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "account" || deletionStatusRequestedRef.current) return;
    deletionStatusRequestedRef.current = true;
    let mounted = true;
    let completed = false;
    void loadAccountDataService()
      .then(({ getAccountDeletionStatus }) => getAccountDeletionStatus())
      .then(({ request }) => {
        if (mounted) setDeletionStatus(request);
      })
      .catch(() => {
        deletionStatusRequestedRef.current = false;
      })
      .finally(() => {
        completed = true;
      });
    return () => {
      mounted = false;
      if (!completed) deletionStatusRequestedRef.current = false;
    };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "email") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeSection]);

  const reloadSenderIdentities = async () => {
    setSenderLoading(true);
    try {
      const { listSenderIdentities } = await loadSenderIdentityService();
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
      const { createSenderIdentity } = await loadSenderIdentityService();
      await createSenderIdentity({ email, displayName: senderDisplayName.trim() || undefined });
      trackEvent("sender_identity_verification_sent");
      setSenderEmail("");
      setSenderDisplayName("");
      await reloadSenderIdentities();
      toast.success("Bestaetigungslink wurde gesendet.");
    } catch (e) {
      logError(e);
      toast.error(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleResend = async (id: string) => {
    setSenderBusyId(id);
    try {
      const { resendSenderIdentity } = await loadSenderIdentityService();
      await resendSenderIdentity(id);
      trackEvent("sender_identity_verification_sent");
      await reloadSenderIdentities();
      toast.success("Bestaetigungslink erneut gesendet.");
    } catch (e) {
      logError(e);
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
      const { disableSenderIdentity } = await loadSenderIdentityService();
      await disableSenderIdentity(id);
      await reloadSenderIdentities();
    } catch (e) {
      logError(e);
      toast.error(e instanceof Error ? e.message : "Deaktivieren fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleTestEmail = async (id: string) => {
    setSenderBusyId(id);
    try {
      const { sendTestEmail } = await loadSenderIdentityService();
      await sendTestEmail(id);
      trackEvent("sender_identity_test_email_sent");
      toast.success("Testmail wurde gesendet.");
    } catch (e) {
      logError(e);
      toast.error(e instanceof Error ? e.message : "Testmail fehlgeschlagen.");
    } finally {
      setSenderBusyId(null);
    }
  };

  const handleDefaultChange = async (value: string) => {
    const next = value || null;
    try {
      const { setDefaultSenderIdentity } = await loadSenderIdentityService();
      await setDefaultSenderIdentity(next);
      setSettings((prev) => ({ ...prev, defaultSenderIdentityId: next }));
      trackEvent("default_sender_identity_updated");
    } catch (e) {
      logError(e);
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
        defaultPaymentTerms: clampPaymentTerms(settings.defaultPaymentTerms),
        numberPadding: Math.max(1, Math.trunc(settings.numberPadding ?? 4)),
      };

      await saveSettings(payload);
      setSettings(payload);
      toast.success("Einstellungen gespeichert!");
    } catch (e) {
      logError(e);
      toast.error(e instanceof Error ? e.message : "Fehler beim Speichern der Einstellungen.");
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    setAccountAction("export");
    try {
      const { downloadAccountData } = await loadAccountDataService();
      await downloadAccountData();
      toast.success("Datenexport wurde erstellt.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Der Datenexport konnte nicht erstellt werden.");
    } finally {
      setAccountAction(null);
    }
  };

  const handleDeletionRequest = async () => {
    if (deletionConfirmation !== "LÖSCHEN" || !deletionPassword) {
      toast.error("Bitte Passwort und den Bestätigungstext LÖSCHEN eingeben.");
      return;
    }
    const accepted = await confirm({
      title: "Accountlöschung beantragen",
      message: "Dein Zugang wird abgemeldet. Laufende Abonnements und gesetzlich aufzubewahrende Rechnungs- oder Abrechnungsdaten müssen vor der endgültigen Löschung gesondert behandelt werden.",
    });
    if (!accepted) return;
    setAccountAction("delete");
    try {
      const { requestAccountDeletion } = await loadAccountDataService();
      const result = await requestAccountDeletion(deletionPassword, deletionConfirmation);
      const scheduled = result.request.scheduled_for ?? result.request.scheduledFor;
      toast.success(result.alreadyRequested ? "Ein Löschauftrag ist bereits aktiv." : `Löschauftrag erstellt${scheduled ? ` (geplant: ${new Date(scheduled).toLocaleDateString("de-DE")})` : ""}.`);
      await supabase.auth.signOut({ scope: "local" });
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Der Löschauftrag konnte nicht erstellt werden.");
    } finally {
      setAccountAction(null);
    }
  };

  const handleDeletionCancel = async () => {
    setAccountAction("delete");
    try { const { cancelAccountDeletion } = await loadAccountDataService(); const { request } = await cancelAccountDeletion(); setDeletionStatus(request); toast.success("Löschauftrag wurde widerrufen."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Löschauftrag konnte nicht widerrufen werden."); }
    finally { setAccountAction(null); }
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

  if (loadError) return <AppCard className="p-6"><h1 className="font-semibold">Einstellungen konnten nicht geladen werden</h1><p className="mt-1 text-sm text-[var(--app-muted)]">Deine gespeicherten Angaben wurden nicht verändert. Prüfe die Verbindung und versuche es erneut.</p><AppButton className="mt-4" onClick={() => setReloadToken((current) => current + 1)}>Erneut versuchen</AppButton></AppCard>;

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

      <nav aria-label="Einstellungsbereiche" className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-2 lg:grid-cols-4">
        {SETTINGS_SECTIONS.map((section) => <button key={section.id} type="button" aria-current={activeSection === section.id ? "page" : undefined} onClick={() => setActiveSection(section.id)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition ${activeSection === section.id ? "bg-[var(--app-primary)] text-white shadow-sm" : "text-[var(--app-muted)] hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/10"}`}>{section.label}</button>)}
      </nav>

      {activeSection === "company" && <>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer</label>
            <input
              className="w-full border rounded p-2"
              value={settings.sellerTaxNumber ?? settings.taxId}
              onChange={(e) => setSettings({ ...settings, sellerTaxNumber: e.target.value, taxId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">USt-ID (optional)</label>
            <input className="w-full border rounded p-2" value={settings.sellerVatId ?? ""} onChange={(e) => setSettings({ ...settings, sellerVatId: e.target.value })} />
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
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Straße</label><input className="w-full border rounded p-2" value={settings.sellerStreet ?? ""} onChange={(e) => setSettings({ ...settings, sellerStreet: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Hausnummer</label><input className="w-full border rounded p-2" value={settings.sellerHouseNumber ?? ""} onChange={(e) => setSettings({ ...settings, sellerHouseNumber: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label><input className="w-full border rounded p-2" value={settings.sellerPostalCode ?? ""} onChange={(e) => setSettings({ ...settings, sellerPostalCode: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ort</label><input className="w-full border rounded p-2" value={settings.sellerCity ?? ""} onChange={(e) => setSettings({ ...settings, sellerCity: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Elektronische Adresse</label><input type="email" className="w-full border rounded p-2" value={settings.sellerElectronicAddress ?? ""} onChange={(e) => setSettings({ ...settings, sellerElectronicAddress: e.target.value, sellerElectronicAddressScheme: "EM" })} placeholder="rechnung@unternehmen.de" /></div>
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

      </>}

      {activeSection === "documents" && <>
      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Zahlungsbedingungen</h2>
          <p className="text-sm text-gray-500">
            Wird als Standard für neue Rechnungen übernommen.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsziel</label>
            <select
              className="w-full border rounded p-2"
              value={paymentTermsPreset}
              onChange={(e) => {
                if (e.target.value === "custom") return;
                setSettings({ ...settings, defaultPaymentTerms: clampPaymentTerms(e.target.value) });
              }}
            >
              {PAYMENT_TERMS_OPTIONS.map((days) => (
                <option key={days} value={String(days)}>
                  {days} Tage
                </option>
              ))}
              <option value="custom">Benutzerdefiniert</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tage bei eigener Auswahl</label>
            <AppNumberInput
              className="w-full border rounded p-2"
              value={clampPaymentTerms(settings.defaultPaymentTerms)}
              onValueChange={(defaultPaymentTerms) =>
                setSettings({
                  ...settings,
                  defaultPaymentTerms: Math.trunc(defaultPaymentTerms),
                })
              }
              min={0}
              max={365}
              step={1}
            />
            <p className="text-xs text-gray-500 mt-1">0–365 Tage möglich.</p>
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Dokument-Standardwerte</h2>
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
            <AppNumberInput
              className="w-full border rounded p-2"
              value={settings.defaultVatRate}
              min={0}
              step="any"
              onValueChange={(defaultVatRate) =>
                setSettings({ ...settings, defaultVatRate })
              }
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Sprache und Währung</div>
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
                {(settings.currency ?? "EUR") !== "EUR" && (
                  <option value={settings.currency} disabled>
                    Nicht unterstützt ({settings.currency})
                  </option>
                )}
                <option value="EUR">EUR – Euro</option>
              </select>
              {(settings.currency ?? "EUR") !== "EUR" && (
                <p className="mt-1 text-xs text-amber-700">Bitte stelle die Standardwährung auf EUR um.</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="text-sm font-semibold text-gray-700">Nummernkreise</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kürzel für Rechnungen</label>
              <input
                className="w-full border rounded p-2"
                value={settings.prefixInvoice ?? ""}
                onChange={(e) => setSettings({ ...settings, prefixInvoice: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kürzel für Angebote</label>
              <input
                className="w-full border rounded p-2"
                value={settings.prefixOffer ?? ""}
                onChange={(e) => setSettings({ ...settings, prefixOffer: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anzahl Ziffern</label>
              <AppNumberInput
                className="w-full border rounded p-2"
                value={settings.numberPadding ?? 4}
                min={1}
                step={1}
                onValueChange={(numberPadding) =>
                  setSettings({
                    ...settings,
                    numberPadding: Math.trunc(numberPadding),
                  })
                }
              />
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="rounded-xl border border-[var(--app-border)] p-5 text-sm text-[var(--app-muted)]" role="status">
              Dokumentgestaltung wird geladen …
            </div>
          }
        >
          <BrandingSettingsSection settings={settings} onChange={setSettings} />
        </Suspense>

        <div className="border-t border-[var(--app-border)] pt-4">
          <label className="mb-1 block text-sm font-medium">Fußzeile auf Dokumenten</label>
          <textarea
            className="w-full border rounded p-2"
            rows={2}
            value={settings.footerText ?? ""}
            onChange={(event) => setSettings({ ...settings, footerText: event.target.value })}
          />
        </div>

      </AppCard>

      </>}

      {activeSection === "email" && <>
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
            {senderLoading && <span className="text-xs text-gray-500">Wird geladen …</span>}
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

      </>}

      {activeSection === "account" && <>
      <AppCard className="space-y-5">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Account und Daten</h2>
          <p className="text-sm text-gray-500">Exportiere deine gespeicherten Daten oder beantrage eine kontrollierte Accountlöschung.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Vollständiger Datenexport</div>
            <div className="text-xs text-gray-500">ZIP-Datei mit JSON- und CSV-Daten. Der Export wird nicht öffentlich gespeichert.</div>
          </div>
          <AppButton variant="secondary" onClick={() => void handleDataExport()} disabled={accountAction !== null}>
            {accountAction === "export" ? "Export wird erstellt..." : "Daten exportieren"}
          </AppButton>
        </div>
        <div className="space-y-3 border-t border-red-200 pt-4">
          {deletionStatus && !["CANCELED", "COMPLETED"].includes(deletionStatus.status) && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"><div>Aktueller Status: {formatDeletionStatus(deletionStatus.status)}</div><div>Geplante Verarbeitung: {new Date(deletionStatus.scheduled_for).toLocaleDateString("de-DE")}</div>{["REQUESTED", "COOLING_OFF"].includes(deletionStatus.status) && <AppButton className="mt-2" variant="secondary" onClick={() => void handleDeletionCancel()} disabled={accountAction !== null}>Löschauftrag widerrufen</AppButton>}</div>}
          <div>
            <div className="text-sm font-medium text-red-700">Account löschen</div>
            <div className="text-xs text-gray-500">Der Auftrag wird mit einer siebentägigen Prüf- und Bearbeitungsfrist angelegt. Aufbewahrungspflichtige Rechnungs- und Abrechnungsdaten werden nicht unkontrolliert gelöscht.</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Aktuelles Passwort</label>
              <input type="password" autoComplete="current-password" className="w-full rounded border p-2" value={deletionPassword} onChange={(event) => setDeletionPassword(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Zur Bestätigung LÖSCHEN eingeben</label>
              <input className="w-full rounded border p-2" value={deletionConfirmation} onChange={(event) => setDeletionConfirmation(event.target.value)} />
            </div>
          </div>
          <AppButton variant="danger" onClick={() => void handleDeletionRequest()} disabled={accountAction !== null || !deletionPassword || deletionConfirmation !== "LÖSCHEN"}>
            {accountAction === "delete" ? "Löschauftrag wird erstellt..." : "Accountlöschung beantragen"}
          </AppButton>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <div className="border-b pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Kontosicherheit</h2>
          <p className="text-sm text-gray-500">Sensible Aktionen für dein Konto.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">Du wirst sofort aus der App abgemeldet.</div>
          <AppButton variant="danger" onClick={() => void handleSignOut()} disabled={signingOut}>
            {signingOut ? "Abmelden..." : "Abmelden"}
          </AppButton>
        </div>
      </AppCard>

      <AppCard className="space-y-3"><h2 className="text-sm font-semibold">Rechtliches und Datenschutz</h2><div className="flex flex-wrap gap-4 text-sm text-[var(--app-primary)]"><Link to="/terms">Bedingungen</Link><Link to="/privacy">Datenschutz</Link><Link to="/dpa">AVV</Link><Link to="/subprocessors">Unterauftragnehmer</Link><Link to="/ai-notice">KI-Hinweise</Link><Link to="/contact">Kontakt</Link></div></AppCard>
      </>}

      <div className="bottom-action-bar safe-area-container">
        <div className="app-container">
          <div className="flex justify-end">
            <AppButton className="w-full sm:w-auto" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Wird gespeichert …" : "Einstellungen speichern"}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
