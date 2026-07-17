import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  FileText,
  ReceiptText,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import * as clientService from "@/app/clients/clientService";
import {
  getOnboardingProgress,
  saveOnboardingProgress,
  type OnboardingProgress,
  type OnboardingStep,
} from "@/app/onboarding/onboardingService";
import { fetchSettings, saveSettings } from "@/app/settings/settingsService";
import { getClientDisplayName } from "@/domain/models/Client";
import { SMALL_BUSINESS_DEFAULT_NOTE } from "@/utils/smallBusiness";
import { supabase } from "@/supabaseClient";
import type { Client, UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

const steps: Array<{
  key: OnboardingStep;
  label: string;
  icon: typeof Sparkles;
}> = [
  { key: "WELCOME", label: "Willkommen", icon: Sparkles },
  { key: "COMPANY", label: "Betrieb", icon: Building2 },
  { key: "TAX", label: "Steuer", icon: ReceiptText },
  { key: "CUSTOMER", label: "Kunde", icon: UserRoundPlus },
  { key: "OFFER", label: "Angebot", icon: FileText },
  { key: "DONE", label: "Fertig", icon: Check },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] px-3 py-3 text-sm";

const getStepIndex = (step: OnboardingStep) =>
  Math.max(0, steps.findIndex((item) => item.key === step));

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedProgress, loadedSettings, loadedClients, userResult] =
        await Promise.all([
          getOnboardingProgress(),
          fetchSettings(),
          clientService.list(),
          supabase.auth.getUser(),
        ]);
      const metadata = userResult.data.user?.user_metadata as
        | Record<string, unknown>
        | undefined;
      setProgress(loadedProgress);
      setSettings({
        ...loadedSettings,
        name:
          loadedSettings.name ||
          [metadata?.first_name, metadata?.last_name]
            .filter((value): value is string => typeof value === "string")
            .join(" "),
        companyName:
          loadedSettings.companyName ||
          (typeof metadata?.company_name === "string"
            ? metadata.company_name
            : ""),
        email:
          loadedSettings.email || userResult.data.user?.email || "",
      });
      setClients(loadedClients);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Einrichtung konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const returnedClientId = searchParams.get("clientId");
  useEffect(() => {
    if (!progress || !returnedClientId || progress.clientId === returnedClientId)
      return;
    let active = true;
    void saveOnboardingProgress("OFFER", { clientId: returnedClientId })
      .then((next) => {
        if (!active) return;
        setProgress(next);
        void clientService.list().then((items) => {
          if (active) setClients(items);
        });
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("clientId");
        setSearchParams(nextParams, { replace: true });
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Kunde konnte nicht übernommen werden.",
          );
      });
    return () => {
      active = false;
    };
  }, [progress, returnedClientId, searchParams, setSearchParams]);

  const currentClient = useMemo(
    () => clients.find((client) => client.id === progress?.clientId) ?? null,
    [clients, progress?.clientId],
  );

  const saveStep = async (
    step: OnboardingStep,
    options: { clientId?: string | null } = {},
  ) => {
    setSaving(true);
    setError(null);
    try {
      setProgress(await saveOnboardingProgress(step, options));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Fortschritt konnte nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveCompany = async () => {
    if (!settings) return;
    if (
      !settings.companyName.trim() ||
      !settings.name.trim() ||
      !settings.email.trim() ||
      !settings.sellerStreet?.trim() ||
      !settings.sellerHouseNumber?.trim() ||
      !settings.sellerPostalCode?.trim() ||
      !settings.sellerCity?.trim()
    ) {
      setError("Bitte fülle alle markierten Angaben zu deinem Betrieb aus.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const address = `${settings.sellerStreet} ${settings.sellerHouseNumber}\n${settings.sellerPostalCode} ${settings.sellerCity}`;
      const nextSettings = {
        ...settings,
        address,
        sellerCountry: "DE" as const,
        currency: "EUR",
      };
      await saveSettings(nextSettings);
      setSettings(nextSettings);
      setProgress(await saveOnboardingProgress("TAX"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Firmendaten konnten nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveTax = async () => {
    if (!settings) return;
    if (
      !settings.sellerTaxNumber?.trim() &&
      !settings.sellerVatId?.trim()
    ) {
      setError("Bitte gib deine Steuernummer oder deine USt-IdNr. an.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nextSettings = {
        ...settings,
        taxId: settings.sellerTaxNumber?.trim() || settings.sellerVatId?.trim() || "",
        defaultVatRate: settings.isSmallBusiness ? 0 : 19,
        smallBusinessNote: settings.isSmallBusiness
          ? settings.smallBusinessNote || SMALL_BUSINESS_DEFAULT_NOTE
          : settings.smallBusinessNote,
      };
      await saveSettings(nextSettings);
      setSettings(nextSettings);
      setProgress(await saveOnboardingProgress("CUSTOMER"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Steuerangaben konnten nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-[var(--app-muted)]">Einrichtung wird geladen…</p>
      </main>
    );
  }

  if (!progress || !settings) {
    return (
      <main className="grid min-h-[60vh] place-items-center p-4">
        <AppCard className="w-full max-w-lg space-y-4 p-6">
          <h1 className="text-xl font-semibold">Einrichtung nicht erreichbar</h1>
          <p role="alert" className="text-sm text-[var(--app-muted)]">
            {error ?? "Bitte versuche es erneut."}
          </p>
          <AppButton onClick={() => void load()}>Erneut versuchen</AppButton>
        </AppCard>
      </main>
    );
  }

  const currentIndex = getStepIndex(progress.step);
  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K],
  ) => setSettings((current) => (current ? { ...current, [key]: value } : current));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6">
        <div className="app-eyebrow">Schnell eingerichtet</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
          Deine ersten Schritte mit FreelanceFlow
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
          Nur die Angaben, die du für dein erstes Angebot brauchst. Weitere
          Einstellungen kannst du später ergänzen.
        </p>
      </div>

      <ol
        aria-label="Einrichtungsfortschritt"
        className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {steps.map((item, index) => {
          const Icon = item.icon;
          const complete = index < currentIndex || progress.step === "DONE";
          const current = index === currentIndex && progress.step !== "DONE";
          return (
            <li
              key={item.key}
              aria-current={current ? "step" : undefined}
              className={`rounded-xl border px-2 py-3 text-center text-xs ${
                current
                  ? "border-[var(--app-primary)] bg-[var(--app-primary)]/[0.08] text-[var(--app-primary)]"
                  : complete
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-[var(--app-border)] text-[var(--app-muted)]"
              }`}
            >
              <Icon className="mx-auto mb-1" size={17} />
              {item.label}
            </li>
          );
        })}
      </ol>

      <AppCard className="p-5 sm:p-8">
        {progress.step === "WELCOME" && (
          <section className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-primary)]/[0.1] text-[var(--app-primary)]">
              <Sparkles size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Willkommen!</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                In wenigen Minuten sind dein Betrieb, die wichtigsten
                Steuerangaben und dein erster Kunde vorbereitet. Danach
                erstellst du direkt dein erstes Angebot.
              </p>
            </div>
            <AppButton disabled={saving} onClick={() => void saveStep("COMPANY")}>
              Einrichtung starten
            </AppButton>
          </section>
        )}

        {progress.step === "COMPANY" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Dein Betrieb</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                Diese Angaben erscheinen später als Absender auf deinen
                Dokumenten.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Firmenname *
                <input className={inputClass} value={settings.companyName} onChange={(event) => updateSetting("companyName", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Inhaber oder Ansprechpartner *
                <input className={inputClass} value={settings.name} onChange={(event) => updateSetting("name", event.target.value)} />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                E-Mail *
                <input type="email" className={inputClass} value={settings.email} onChange={(event) => updateSetting("email", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Straße *
                <input className={inputClass} value={settings.sellerStreet ?? ""} onChange={(event) => updateSetting("sellerStreet", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Hausnummer *
                <input className={inputClass} value={settings.sellerHouseNumber ?? ""} onChange={(event) => updateSetting("sellerHouseNumber", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                PLZ *
                <input inputMode="numeric" className={inputClass} value={settings.sellerPostalCode ?? ""} onChange={(event) => updateSetting("sellerPostalCode", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Ort *
                <input className={inputClass} value={settings.sellerCity ?? ""} onChange={(event) => updateSetting("sellerCity", event.target.value)} />
              </label>
            </div>
            <div className="flex justify-end">
              <AppButton disabled={saving} onClick={() => void saveCompany()}>
                Firmendaten speichern
              </AppButton>
            </div>
          </section>
        )}

        {progress.step === "TAX" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Steuerliche Grundlage</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                Damit FreelanceFlow Steuern auf neuen Positionen passend
                vorbelegt. Die Auswahl ersetzt keine steuerliche Beratung.
              </p>
            </div>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium">Wie rechnest du ab?</legend>
              <label className="flex cursor-pointer gap-3 rounded-2xl border border-[var(--app-border)] p-4">
                <input type="radio" name="tax-mode" checked={!settings.isSmallBusiness} onChange={() => updateSetting("isSmallBusiness", false)} />
                <span><span className="block font-semibold">Mit Umsatzsteuer</span><span className="mt-1 block text-xs text-[var(--app-muted)]">Standardmäßig 19 %, bei Bedarf 7 % je Position.</span></span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-2xl border border-[var(--app-border)] p-4">
                <input type="radio" name="tax-mode" checked={settings.isSmallBusiness} onChange={() => updateSetting("isSmallBusiness", true)} />
                <span><span className="block font-semibold">Kleinunternehmer</span><span className="mt-1 block text-xs text-[var(--app-muted)]">Ohne ausgewiesene Umsatzsteuer.</span></span>
              </label>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Steuernummer
                <input className={inputClass} value={settings.sellerTaxNumber ?? ""} onChange={(event) => updateSetting("sellerTaxNumber", event.target.value)} />
              </label>
              <label className="text-sm font-medium">
                USt-IdNr.
                <input className={inputClass} value={settings.sellerVatId ?? ""} onChange={(event) => updateSetting("sellerVatId", event.target.value)} />
              </label>
              <p className="text-xs leading-5 text-[var(--app-muted)] sm:col-span-2">
                Eine der beiden Angaben ist erforderlich. Kleinunternehmer
                benötigen nicht automatisch eine USt-IdNr.
              </p>
            </div>
            <div className="flex justify-end">
              <AppButton disabled={saving} onClick={() => void saveTax()}>
                Steuerangaben speichern
              </AppButton>
            </div>
          </section>
        )}

        {progress.step === "CUSTOMER" && (
          <section className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-primary)]/[0.1] text-[var(--app-primary)]">
              <UserRoundPlus size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Dein erster Kunde</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                Einmal angelegt, kannst du Name und Adresse in künftigen
                Angeboten und Rechnungen direkt übernehmen.
              </p>
            </div>
            {clients.length > 0 && (
              <label className="mx-auto block max-w-md text-left text-sm font-medium">
                Bestehenden Kunden verwenden
                <select
                  className={inputClass}
                  value={progress.clientId ?? ""}
                  onChange={(event) =>
                    void saveStep("OFFER", { clientId: event.target.value })
                  }
                >
                  <option value="">Kunde auswählen</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{getClientDisplayName(client)}</option>
                  ))}
                </select>
              </label>
            )}
            <AppButton
              onClick={() =>
                navigate(
                  `/app/customers/new?onboarding=1&returnUrl=${encodeURIComponent("/app/onboarding")}`,
                )
              }
            >
              Neuen Kunden anlegen
            </AppButton>
          </section>
        )}

        {progress.step === "OFFER" && (
          <section className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--app-primary)]/[0.1] text-[var(--app-primary)]">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Erstes Angebot erstellen</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                {currentClient
                  ? `${getClientDisplayName(currentClient)} ist bereits ausgewählt. Ergänze nur noch deine Leistung und den Preis.`
                  : "Wähle einen Kunden aus, damit du dein erstes Angebot erstellen kannst."}
              </p>
            </div>
            {!currentClient && clients.length > 0 && (
              <label className="mx-auto block max-w-md text-left text-sm font-medium">
                Kunde
                <select className={inputClass} value="" onChange={(event) => void saveStep("OFFER", { clientId: event.target.value })}>
                  <option value="">Kunde auswählen</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{getClientDisplayName(client)}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {!currentClient && (
                <AppButton variant="secondary" onClick={() => void saveStep("CUSTOMER")}>
                  Kunden anlegen
                </AppButton>
              )}
              <AppButton
                disabled={!currentClient}
                onClick={() => {
                  if (!currentClient) return;
                  navigate(
                    `/app/offers/new?onboarding=1&clientId=${encodeURIComponent(currentClient.id)}&returnUrl=${encodeURIComponent("/app/onboarding")}`,
                  );
                }}
              >
                Angebot erstellen
              </AppButton>
            </div>
          </section>
        )}

        {progress.step === "DONE" && (
          <section className="space-y-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check size={30} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Du bist startklar</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                Dein Betrieb, dein erster Kunde und dein erstes Angebot sind
                angelegt. Ab jetzt findest du alles im Arbeitsbereich wieder.
              </p>
            </div>
            <AppButton onClick={() => navigate("/app/documents", { replace: true })}>
              Zu meinen Dokumenten
            </AppButton>
          </section>
        )}

        {error && (
          <div role="alert" className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </AppCard>
    </main>
  );
}
