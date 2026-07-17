import {
  Check,
  CalendarDays,
  Eye,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import type { Client, Position, TaxCategory } from "@/types";
import type { DocumentFormData } from "@/features/documents/documentEditorModel";
import { formatMoney, getCurrencySymbol } from "@/utils/money";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppNumberInput } from "@/ui/AppNumberInput";
import { PositionSuggestionInput } from "@/features/documents/PositionSuggestionInput";
import { getClientDisplayName } from "@/domain/models/Client";
import {
  isSupportedPositionTax,
  resolveSupportedPositionTax,
  SUPPORTED_TAX_RATES,
  TAX_CATEGORY_LABELS,
} from "@/domain/rules/tax";

type Props = {
  type: "offer" | "invoice";
  data: DocumentFormData;
  clients: Client[];
  currency: string;
  locale: string;
  totals: { subtotal: number; tax: number; total: number };
  disabled: boolean;
  saving: boolean;
  isEditing?: boolean;
  onChange: (data: DocumentFormData) => void;
  onClientChange: (clientId: string) => void;
  onAddPosition: () => void;
  onUpdatePosition: (
    index: number,
    field: keyof Position,
    value: string | number,
  ) => void;
  onRemovePosition: (index: number) => void;
  onOpenAi: () => void;
  onOpenGroups: () => void;
  onPreview: () => void;
  onCancel: () => void;
  onSave: () => void;
};

const inputClass =
  "w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] px-3 py-2.5 text-sm";

const documentSteps = [
  { key: "kunde", label: "Kunde" },
  { key: "dokument", label: "Dokumentdaten" },
  { key: "positionen", label: "Positionen" },
  { key: "texte", label: "Texte & Optionen" },
  { key: "vorschau", label: "Vorschau" },
] as const;

type DocumentStep = (typeof documentSteps)[number]["key"];

export function DocumentCreateComposer({
  type,
  data,
  clients,
  currency,
  locale,
  totals,
  disabled,
  saving,
  isEditing = false,
  onChange,
  onClientChange,
  onAddPosition,
  onUpdatePosition,
  onRemovePosition,
  onOpenAi,
  onOpenGroups,
  onPreview,
  onCancel,
  onSave,
}: Props) {
  const isInvoice = type === "invoice";
  const wizardEnabled = !isEditing;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedStep = searchParams.get("step") as DocumentStep | null;
  const [step, setStep] = useState<DocumentStep>(() =>
    documentSteps.some((item) => item.key === requestedStep)
      ? (requestedStep as DocumentStep)
      : "kunde",
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const currencySymbol = getCurrencySymbol(data.currency ?? currency, locale);
  const client = clients.find((item) => item.id === data.clientId);
  const canSave = Boolean(
    data.clientId &&
    data.positions.length > 0 &&
    (isInvoice || data.validUntil),
  );
  const clientValid = Boolean(data.clientId && client);
  const serviceDateValid = Boolean(
    (data.serviceDate && !data.servicePeriodStart && !data.servicePeriodEnd) ||
    (!data.serviceDate &&
      data.servicePeriodStart &&
      data.servicePeriodEnd &&
      data.servicePeriodEnd >= data.servicePeriodStart),
  );
  const documentValid = isInvoice
    ? Boolean(data.date && data.currency && serviceDateValid)
    : Boolean(
        data.number?.trim() &&
        data.date &&
        data.validUntil &&
        data.currency &&
        data.validUntil >= data.date,
      );
  const positionsValid =
    data.positions.length > 0 &&
    data.positions.every((position) =>
      Boolean(
        position.description.trim() &&
        position.unit.trim() &&
        Number(position.quantity) > 0 &&
        Number(position.price) >= 0,
      ),
    );
  const stepIndex = documentSteps.findIndex((item) => item.key === step);
  const highestReachableIndex = clientValid
    ? documentValid
      ? positionsValid
        ? 4
        : 2
      : 1
    : 0;
  const summaryDate = data.date
    ? new Date(`${data.date}T00:00:00`).toLocaleDateString(locale)
    : "Noch nicht angegeben";

  useEffect(() => {
    if (!wizardEnabled) return;
    const requestedIndex = documentSteps.findIndex(
      (item) => item.key === requestedStep,
    );
    const nextIndex =
      requestedIndex < 0 ? 0 : Math.min(requestedIndex, highestReachableIndex);
    const nextStep = documentSteps[nextIndex].key;
    if (nextStep !== step) setStep(nextStep);
    if (searchParams.get("step") !== nextStep) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("step", nextStep);
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    highestReachableIndex,
    requestedStep,
    searchParams,
    setSearchParams,
    step,
    wizardEnabled,
  ]);

  const goToStep = (nextStep: DocumentStep) => {
    const nextIndex = documentSteps.findIndex((item) => item.key === nextStep);
    if (nextIndex > highestReachableIndex) return;
    setValidationMessage(null);
    setStep(nextStep);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("step", nextStep);
    setSearchParams(nextParams, { replace: true });
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`document-step-${nextStep}`);
      if (typeof target?.scrollIntoView === "function")
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const continueWizard = () => {
    const valid =
      step === "kunde"
        ? clientValid
        : step === "dokument"
          ? documentValid
          : step === "positionen"
            ? positionsValid
            : true;
    if (!valid) {
      const message =
        step === "kunde"
          ? "Bitte wähle einen gültigen Kunden aus."
          : step === "dokument"
            ? isInvoice
              ? "Bitte prüfe Datum, Währung und Leistungsangabe."
              : "Bitte prüfe Angebotsnummer, Datum, Gültigkeit und Währung."
            : "Füge mindestens eine vollständig ausgefüllte Position hinzu.";
      setValidationMessage(message);
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`document-step-${step}`);
        if (typeof target?.scrollIntoView === "function")
          target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    const next =
      documentSteps[Math.min(stepIndex + 1, documentSteps.length - 1)];
    goToStep(next.key);
  };

  const continueLabel =
    step === "kunde"
      ? "Weiter zu Dokumentdaten"
      : step === "dokument"
        ? "Weiter zu Positionen"
        : step === "positionen"
          ? "Weiter zu Texte und Optionen"
          : "Weiter zur Vorschau";

  return (
    <div
      data-testid="document-composer-layout"
      className={
        isEditing
          ? "min-h-0 bg-[var(--app-bg)]"
          : "grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-[var(--app-bg)]"
      }
    >
      <div className={isEditing ? "p-4 sm:p-6 lg:p-8" : "min-h-0 overflow-y-auto overscroll-contain scroll-pb-32 p-4 sm:p-6 lg:p-8"}>
        <div className="mx-auto grid max-w-6xl items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
          <main className="min-w-0 space-y-5">
            <div>
              <div className="app-eyebrow">Neues Dokument</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
                {isEditing
                  ? isInvoice
                    ? "Rechnung bearbeiten"
                    : "Angebot bearbeiten"
                  : isInvoice
                    ? "Rechnung erstellen"
                    : "Angebot erstellen"}
              </h2>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {wizardEnabled
                  ? `Schritt für Schritt zu ${isInvoice ? "einer vollständigen Rechnung" : "einem vollständigen Angebot"}.`
                  : "Alle Angaben auf einer übersichtlichen Arbeitsfläche."}
              </p>
            </div>

            {wizardEnabled && (
              <nav
                aria-label={`Fortschritt ${isInvoice ? "Rechnungs" : "Angebots"}erstellung`}
                className="pb-1"
              >
                <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-4 sm:hidden">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">Schritt {stepIndex + 1} von {documentSteps.length}</span>
                    <span className="text-[var(--app-muted)]">{documentSteps[stepIndex].label}</span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"
                    role="progressbar"
                    aria-label="Fortschritt"
                    aria-valuemin={1}
                    aria-valuemax={documentSteps.length}
                    aria-valuenow={stepIndex + 1}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--app-primary)] transition-[width]"
                      style={{ width: `${((stepIndex + 1) / documentSteps.length) * 100}%` }}
                    />
                  </div>
                </div>
                <ol className="hidden grid-cols-5 gap-2 sm:grid">
                  {documentSteps.map((item, index) => {
                    const active = item.key === step;
                    const complete = index < stepIndex;
                    const reachable = index <= highestReachableIndex;
                    return (
                      <li key={item.key} className="min-w-0">
                        <button
                          type="button"
                          aria-current={active ? "step" : undefined}
                          disabled={!reachable}
                          onClick={() => goToStep(item.key)}
                          className={`flex min-h-14 w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 text-left text-sm transition-colors ${active ? "border-[var(--app-primary)] bg-blue-500/10 font-semibold text-[var(--app-primary)]" : complete ? "border-green-500/30 bg-green-500/10" : "border-[var(--app-border)] text-[var(--app-muted)]"}`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${active ? "bg-[var(--app-primary)] text-white" : complete ? "bg-green-600 text-white" : "bg-black/5 dark:bg-white/10"}`}
                          >
                            {complete ? <Check size={15} /> : index + 1}
                          </span>
                          <span className="min-w-0 [overflow-wrap:anywhere] leading-tight">
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}

            {wizardEnabled && validationMessage && (
              <div
                role="alert"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
              >
                {validationMessage}
              </div>
            )}

            {(!wizardEnabled || step === "kunde") && (
              <div id="document-step-kunde">
                <AppCard className="p-0 overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                      1
                    </span>
                    <div>
                      <div className="font-semibold">Kunde</div>
                      <div className="text-xs text-[var(--app-muted)]">
                        Empfänger des Dokuments auswählen
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <label
                      htmlFor="composer-client"
                      className="text-sm font-medium"
                    >
                      Kunde auswählen
                    </label>
                    <select
                      id="composer-client"
                      className={`${inputClass} mt-2`}
                      value={data.clientId}
                      disabled={disabled}
                      onChange={(event) => onClientChange(event.target.value)}
                      aria-invalid={
                        wizardEnabled &&
                        Boolean(validationMessage) &&
                        !clientValid
                      }
                    >
                      <option value="">Kunde suchen oder auswählen</option>
                      {clients.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getClientDisplayName(item)}
                        </option>
                      ))}
                    </select>
                    {client && (
                      <div className="mt-3 flex items-start gap-3 rounded-xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                        <UserRound
                          size={18}
                          className="mt-0.5 text-[var(--app-muted)]"
                        />
                        <div>
                          <div className="text-sm font-semibold">
                            {getClientDisplayName(client)}
                          </div>
                          <div className="mt-1 text-xs text-[var(--app-muted)]">
                            {[client.contactPerson, client.email]
                              .filter(Boolean)
                              .join(" · ") || "Keine Kontaktdaten hinterlegt"}
                          </div>
                        </div>
                      </div>
                    )}
                    {wizardEnabled && (
                      <div className="mt-4">
                        <AppButton
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            navigate(
                              `/app/customers/new?returnUrl=${encodeURIComponent(`${location.pathname}?step=kunde`)}`,
                            )
                          }
                        >
                          <Plus size={16} /> Neuen Kunden anlegen
                        </AppButton>
                      </div>
                    )}
                  </div>
                </AppCard>
              </div>
            )}

            {(!wizardEnabled || step === "dokument") && (
              <div id="document-step-dokument">
                <AppCard className="p-0 overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                      2
                    </span>
                    <div>
                      <div className="font-semibold">Dokumentdaten</div>
                      <div className="text-xs text-[var(--app-muted)]">
                        Nummer, Datum und Konditionen
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="text-sm font-medium">
                      {isInvoice ? "Rechnungsnummer" : "Angebotsnummer"}
                      <input
                        className={`${inputClass} mt-2`}
                        value={data.number ?? ""}
                        disabled={disabled || isInvoice}
                        placeholder={
                          isInvoice
                            ? "Wird beim Finalisieren vergeben"
                            : "ANG-0001"
                        }
                        onChange={(event) =>
                          onChange({ ...data, number: event.target.value })
                        }
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Datum
                      <input
                        type="date"
                        className={`${inputClass} mt-2`}
                        value={data.date}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange({ ...data, date: event.target.value })
                        }
                      />
                    </label>
                    {isInvoice ? (
                      <label className="text-sm font-medium">
                        Zahlungsziel
                        <select
                          className={`${inputClass} mt-2`}
                          value={data.paymentTermsDays ?? 14}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange({
                              ...data,
                              paymentTermsDays: Number(event.target.value),
                            })
                          }
                        >
                          <option value={7}>7 Tage</option>
                          <option value={14}>14 Tage</option>
                          <option value={30}>30 Tage</option>
                          <option value={60}>60 Tage</option>
                        </select>
                      </label>
                    ) : (
                      <label className="text-sm font-medium">
                        Gültig bis
                        <input
                          type="date"
                          className={`${inputClass} mt-2`}
                          value={data.validUntil ?? ""}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange({
                              ...data,
                              validUntil: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {isInvoice && (
                      <label className="text-sm font-medium">
                        Leistungsangabe
                        <select
                          className={`${inputClass} mt-2`}
                          value={data.serviceDate ? "date" : "period"}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange(
                              event.target.value === "date"
                                ? {
                                    ...data,
                                    serviceDate: data.serviceDate || data.date,
                                    servicePeriodStart: undefined,
                                    servicePeriodEnd: undefined,
                                  }
                                : {
                                    ...data,
                                    serviceDate: undefined,
                                    servicePeriodStart: data.date,
                                    servicePeriodEnd: data.date,
                                  },
                            )
                          }
                        >
                          <option value="date">Leistungsdatum</option>
                          <option value="period">Leistungszeitraum</option>
                        </select>
                      </label>
                    )}
                    {isInvoice && data.serviceDate && (
                      <label className="text-sm font-medium">
                        Leistungsdatum
                        <input
                          type="date"
                          className={`${inputClass} mt-2`}
                          value={data.serviceDate}
                          disabled={disabled}
                          onChange={(event) =>
                            onChange({
                              ...data,
                              serviceDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {isInvoice && !data.serviceDate && (
                      <>
                        <label className="text-sm font-medium">
                          Leistung von
                          <input
                            type="date"
                            className={`${inputClass} mt-2`}
                            value={data.servicePeriodStart ?? ""}
                            disabled={disabled}
                            onChange={(event) =>
                              onChange({
                                ...data,
                                servicePeriodStart: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-sm font-medium">
                          Leistung bis
                          <input
                            type="date"
                            className={`${inputClass} mt-2`}
                            value={data.servicePeriodEnd ?? ""}
                            disabled={disabled}
                            onChange={(event) =>
                              onChange({
                                ...data,
                                servicePeriodEnd: event.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                    <label className="text-sm font-medium">
                      Standard-Steuersatz
                      <select
                        aria-label="Standard-MwSt. (%)"
                        className={`${inputClass} mt-2`}
                        value={data.isSmallBusiness ? 0 : data.vatRate ?? 19}
                        disabled={disabled || Boolean(data.isSmallBusiness)}
                        onChange={(event) => {
                          const vatRate = Number(event.target.value);
                          const taxCategory: TaxCategory = vatRate === 7 ? "REDUCED" : "STANDARD";
                          onChange({
                            ...data,
                            vatRate,
                            positions: data.positions.map((position) => ({
                              ...position,
                              taxCategory,
                              taxRate: vatRate,
                              taxExemptionReason: undefined,
                            })),
                          });
                        }}
                      >
                        {!data.isSmallBusiness && ![7, 19].includes(Number(data.vatRate)) && (
                          <option value={data.vatRate} disabled>
                            Nicht unterstützt ({Number(data.vatRate)} %)
                          </option>
                        )}
                        {data.isSmallBusiness ? (
                          <option value={0}>Kleinunternehmer (0 %)</option>
                        ) : (
                          <>
                            <option value={19}>Regelsteuer (19 %)</option>
                            <option value={7}>Ermäßigte Steuer (7 %)</option>
                          </>
                        )}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Währung
                      <select
                        aria-label="Währung"
                        className={`${inputClass} mt-2`}
                        value={data.currency ?? currency}
                        disabled={disabled}
                        onChange={(event) => onChange({ ...data, currency: event.target.value })}
                      >
                        {(data.currency ?? currency) !== "EUR" && (
                          <option value={data.currency ?? currency} disabled>
                            Nicht unterstützt ({data.currency ?? currency})
                          </option>
                        )}
                        <option value="EUR">EUR – Euro</option>
                      </select>
                      {(data.currency ?? currency) !== "EUR" && (
                        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                          Fremdwährungen werden derzeit nicht unterstützt. Bitte stelle das Dokument auf EUR um.
                        </span>
                      )}
                    </label>
                  </div>
                </AppCard>
              </div>
            )}

            {(!wizardEnabled || step === "positionen") && (
              <div id="document-step-positionen">
                <AppCard className="p-0 overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-[var(--app-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                        3
                      </span>
                      <div>
                        <div className="font-semibold">Positionen</div>
                        <div className="text-xs text-[var(--app-muted)]">
                          Leistungen und Preise erfassen
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AppButton
                        type="button"
                        variant="secondary"
                        onClick={onOpenGroups}
                        disabled={disabled}
                      >
                        Paket einfügen
                      </AppButton>
                      <AppButton
                        type="button"
                        variant="secondary"
                        onClick={onOpenAi}
                        disabled={disabled}
                      >
                        <Sparkles size={16} /> Mit KI erstellen
                      </AppButton>
                    </div>
                  </div>
                  <div className="p-5">
                    {data.positions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[var(--app-border)] px-5 py-8 text-center">
                        <FileText className="mx-auto text-[var(--app-muted)]" />
                        <div className="mt-3 font-medium">
                          Noch keine Positionen
                        </div>
                        <p className="mt-1 text-sm text-[var(--app-muted)]">
                          Füge eine Position hinzu oder lasse einen KI-Entwurf
                          erstellen.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.positions.map((position, index) => (
                          <div
                            key={position.id}
                            className="grid gap-2 rounded-2xl border border-[var(--app-border)] p-3 md:grid-cols-[minmax(0,1fr)_85px_90px_120px_44px] md:items-center"
                          >
                            <label className="space-y-1 md:contents">
                              <span className="text-xs font-medium text-[var(--app-muted)] md:sr-only">Leistung oder Produkt</span>
                              <PositionSuggestionInput
                                ariaLabel={`Beschreibung ${index + 1}`}
                                value={position.description}
                                disabled={disabled}
                                customerId={data.clientId}
                                documentType={type}
                                currency={data.currency ?? currency}
                                onChange={(value) => onUpdatePosition(index, "description", value)}
                                onSelect={(suggestion) => {
                                  const tax = resolveSupportedPositionTax(
                                    suggestion,
                                    Number(data.vatRate),
                                    Boolean(data.isSmallBusiness),
                                  );
                                  onUpdatePosition(index, "description", suggestion.title);
                                  onUpdatePosition(index, "quantity", suggestion.quantity || 1);
                                  onUpdatePosition(index, "unit", suggestion.unit || "Stk");
                                  onUpdatePosition(index, "price", suggestion.lastPrice ?? suggestion.standardPrice ?? 0);
                                  onUpdatePosition(index, "taxCategory", tax.taxCategory);
                                  onUpdatePosition(index, "taxRate", tax.taxRate);
                                }}
                              />
                            </label>
                            <label className="space-y-1 md:contents">
                              <span className="text-xs font-medium text-[var(--app-muted)] md:sr-only">Menge</span>
                              <AppNumberInput
                                aria-label={`Menge ${index + 1}`}
                                className={inputClass}
                                value={position.quantity}
                                disabled={disabled}
                                min={0}
                                step="any"
                                onValueChange={(quantity) => onUpdatePosition(index, "quantity", quantity)}
                              />
                            </label>
                            <label className="space-y-1 md:contents">
                              <span className="text-xs font-medium text-[var(--app-muted)] md:sr-only">Einheit</span>
                              <input
                                aria-label={`Einheit ${index + 1}`}
                                className={inputClass}
                                value={position.unit}
                                disabled={disabled}
                                onChange={(event) => onUpdatePosition(index, "unit", event.target.value)}
                              />
                            </label>
                            <label className="space-y-1 md:contents">
                              <span className="text-xs font-medium text-[var(--app-muted)] md:sr-only">Einzelpreis</span>
                              <AppNumberInput
                                aria-label={`Preis ${index + 1}`}
                                className={`${inputClass} pr-10`}
                                value={position.price}
                                disabled={disabled}
                                min={0}
                                step="any"
                                suffix={currencySymbol}
                                onValueChange={(price) => onUpdatePosition(index, "price", price)}
                              />
                            </label>
                            <button
                              type="button"
                              aria-label={`Position ${index + 1} löschen`}
                              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 md:w-11 md:rounded-full"
                              onClick={() => onRemovePosition(index)}
                            >
                              <Trash2 size={16} />
                              <span className="md:sr-only">Position löschen</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {data.positions.length > 0 && (
                      <div className="mt-4 space-y-3 border-t border-[var(--app-border)] pt-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                          Steuer je Position
                        </div>
                        {data.positions.map((position, index) => (
                          <div
                            key={`tax-${position.id}`}
                            className="grid gap-2 rounded-xl bg-black/[0.025] p-3 sm:grid-cols-[minmax(0,1fr)_240px]"
                          >
                            <div className="min-w-0 self-center truncate text-sm font-medium">
                              {position.description || `Position ${index + 1}`}
                            </div>
                            <div>
                              <select
                                aria-label={`Steuerart ${index + 1}`}
                                className={inputClass}
                                value={position.taxCategory ?? (data.isSmallBusiness ? "SMALL_BUSINESS" : Number(data.vatRate) === 7 ? "REDUCED" : "STANDARD")}
                                disabled={disabled}
                                onChange={(event) => {
                                  const category = event.target.value as keyof typeof SUPPORTED_TAX_RATES;
                                  onUpdatePosition(index, "taxCategory", category);
                                  onUpdatePosition(index, "taxRate", SUPPORTED_TAX_RATES[category]);
                                }}
                              >
                                {!isSupportedPositionTax(position, Boolean(data.isSmallBusiness)) && position.taxCategory && (
                                  <option value={position.taxCategory} disabled>
                                    Nicht unterstützt: {TAX_CATEGORY_LABELS[position.taxCategory]}
                                  </option>
                                )}
                                {data.isSmallBusiness ? (
                                  <option value="SMALL_BUSINESS">{TAX_CATEGORY_LABELS.SMALL_BUSINESS}</option>
                                ) : (
                                  <>
                                    <option value="STANDARD">{TAX_CATEGORY_LABELS.STANDARD}</option>
                                    <option value="REDUCED">{TAX_CATEGORY_LABELS.REDUCED}</option>
                                  </>
                                )}
                              </select>
                              {!isSupportedPositionTax(position, Boolean(data.isSmallBusiness)) && (
                                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                  Dieser Steuerfall kann derzeit nicht ausgestellt werden. Bitte wähle 19 %, 7 % oder Kleinunternehmer.
                                </p>
                              )}
                            </div>
                            {position.taxCategory === "EXEMPT" && (
                              <input
                                aria-label={`Grund Steuerbefreiung ${index + 1}`}
                                className={`${inputClass} sm:col-span-2`}
                                placeholder="Rechtsgrund der Steuerbefreiung"
                                value={position.taxExemptionReason ?? ""}
                                disabled={disabled}
                                onChange={(event) =>
                                  onUpdatePosition(
                                    index,
                                    "taxExemptionReason",
                                    event.target.value,
                                  )
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <AppButton
                      type="button"
                      variant="ghost"
                      className="mt-4"
                      onClick={onAddPosition}
                      disabled={disabled}
                    >
                      <Plus size={17} />
                      Position hinzufügen
                    </AppButton>
                  </div>
                </AppCard>
              </div>
            )}

            {(!wizardEnabled || step === "texte") && (
              <div id="document-step-texte">
                <AppCard className="p-0 overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                      4
                    </span>
                    <div>
                      <div className="font-semibold">Texte & Optionen</div>
                      <div className="text-xs text-[var(--app-muted)]">
                        Persönliche Einleitung und Abschluss
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Einleitung
                      <textarea
                        rows={4}
                        className={`${inputClass} mt-2 resize-y`}
                        value={data.introText}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange({ ...data, introText: event.target.value })
                        }
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Abschlusstext
                      <textarea
                        rows={4}
                        className={`${inputClass} mt-2 resize-y`}
                        value={data.footerText}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange({ ...data, footerText: event.target.value })
                        }
                      />
                    </label>
                  </div>
                </AppCard>
              </div>
            )}

            {wizardEnabled && step === "vorschau" && (
              <div id="document-step-vorschau">
                <AppCard className="overflow-hidden p-0">
                  <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]">
                      5
                    </span>
                    <div>
                      <div className="font-semibold">Vorschau & Abschluss</div>
                      <div className="text-xs text-[var(--app-muted)]">
                        Prüfe alle Angaben vor dem Erstellen
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                        <div className="text-xs text-[var(--app-muted)]">
                          Kunde
                        </div>
                        <div className="mt-1 font-medium">
                          {client ? getClientDisplayName(client) : "Noch nicht angegeben"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                        <div className="text-xs text-[var(--app-muted)]">
                          {isInvoice ? "Rechnungsnummer" : "Angebotsnummer"}
                        </div>
                        <div className="mt-1 font-medium">
                          {data.number ||
                            (isInvoice
                              ? "Wird beim Finalisieren vergeben"
                              : "Noch nicht angegeben")}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                        <div className="text-xs text-[var(--app-muted)]">
                          {isInvoice
                            ? "Datum / Zahlungsziel"
                            : "Datum / gültig bis"}
                        </div>
                        <div className="mt-1 font-medium">
                          {summaryDate} /{" "}
                          {isInvoice
                            ? `${data.paymentTermsDays ?? 14} Tage`
                            : data.validUntil
                              ? new Date(
                                  `${data.validUntil}T00:00:00`,
                                ).toLocaleDateString(locale)
                              : "Noch nicht angegeben"}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                        <div className="text-xs text-[var(--app-muted)]">
                          Positionen
                        </div>
                        <div className="mt-1 font-medium">
                          {data.positions.length}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--app-border)] p-4">
                      <div className="flex justify-between text-sm text-[var(--app-muted)]">
                        <span>Netto</span>
                        <span>
                          {formatMoney(
                            totals.subtotal,
                            data.currency ?? currency,
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-[var(--app-muted)]">
                        <span>MwSt.</span>
                        <span>
                          {formatMoney(
                            totals.tax,
                            data.currency ?? currency,
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between border-t border-[var(--app-border)] pt-3 text-lg font-semibold">
                        <span>Gesamt</span>
                        <span>
                          {formatMoney(
                            totals.total,
                            data.currency ?? currency,
                            locale,
                          )}
                        </span>
                      </div>
                    </div>
                    <AppButton
                      type="button"
                      variant="secondary"
                      onClick={onPreview}
                    >
                      <Eye size={17} /> Vollständige Dokumentvorschau öffnen
                    </AppButton>
                  </div>
                </AppCard>
              </div>
            )}
          </main>

          <aside className="space-y-4 xl:sticky xl:top-4">
            <AppCard className="p-5">
              <div className="app-eyebrow">Zusammenfassung</div>
              <div className="mt-4 flex items-start gap-3">
                <UserRound
                  size={17}
                  className="mt-0.5 text-[var(--app-muted)]"
                />
                <div>
                  <div className="text-xs text-[var(--app-muted)]">Kunde</div>
                  <div className="text-sm font-medium">
                    {client ? getClientDisplayName(client) : "Noch nicht angegeben"}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <CalendarDays
                  size={17}
                  className="mt-0.5 text-[var(--app-muted)]"
                />
                <div>
                  <div className="text-xs text-[var(--app-muted)]">
                    Dokumentdatum
                  </div>
                  <div className="text-sm font-medium">{summaryDate}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--app-muted)]">
                    {isInvoice ? "Rechnungsnummer" : "Angebotsnummer"}
                  </span>
                  <span className="text-right font-medium">
                    {data.number ||
                      (isInvoice
                        ? "Wird beim Finalisieren vergeben"
                        : "Noch nicht angegeben")}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--app-muted)]">Positionen</span>
                  <span className="font-medium">{data.positions.length}</span>
                </div>
              </div>
              <div className="my-5 h-px bg-[var(--app-border)]" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[var(--app-muted)]">
                  <span>Netto</span>
                  <span>{formatMoney(totals.subtotal, currency, locale)}</span>
                </div>
                <div className="flex justify-between text-[var(--app-muted)]">
                  <span>MwSt.</span>
                  <span>{formatMoney(totals.tax, currency, locale)}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--app-border)] pt-3 text-lg font-semibold">
                  <span>Gesamt</span>
                  <span>{formatMoney(totals.total, currency, locale)}</span>
                </div>
              </div>
              <AppButton
                type="button"
                variant="secondary"
                className="mt-5 w-full"
                onClick={onPreview}
              >
                <Eye size={17} />
                Dokumentvorschau
              </AppButton>
            </AppCard>
            {!canSave && (
              <div className="rounded-2xl bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
                Wähle einen Kunden und füge mindestens eine Position hinzu.
              </div>
            )}
          </aside>
        </div>
      </div>

      <footer className={`border-t border-[var(--app-border)] bg-[var(--app-surface-solid)] px-4 py-3 safe-bottom sm:px-6 ${isEditing ? "sticky bottom-0 z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]" : ""}`}>
        {wizardEnabled ? (
          <div className={`mx-auto grid max-w-6xl items-center gap-2 sm:flex sm:justify-between ${step === "vorschau" ? "grid-cols-1" : "grid-cols-[auto_minmax(0,1fr)]"}`}>
            <div className={step === "vorschau" ? "w-full sm:w-auto" : undefined}>
              {step === "kunde" ? (
                <AppButton type="button" variant="ghost" onClick={onCancel}>
                  Abbrechen
                </AppButton>
              ) : (
                <AppButton
                  type="button"
                  variant="secondary"
                  className={step === "vorschau" ? "w-full sm:w-auto" : undefined}
                  onClick={() => goToStep(documentSteps[stepIndex - 1].key)}
                >
                  Zurück{step === "vorschau" ? " und bearbeiten" : ""}
                </AppButton>
              )}
            </div>
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
              {step === "vorschau" ? (
                <>
                  <AppButton
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={!canSave || saving}
                    onClick={onSave}
                  >
                    Als Entwurf speichern
                  </AppButton>
                  <AppButton
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={!canSave || saving}
                    onClick={onSave}
                  >
                    {saving
                      ? "Wird gespeichert …"
                      : isInvoice
                        ? "Rechnung erstellen"
                        : "Angebot erstellen"}
                  </AppButton>
                </>
              ) : (
                <AppButton
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={continueWizard}
                  disabled={disabled}
                  aria-label={continueLabel}
                >
                  <span className="sm:hidden">Weiter</span>
                  <span className="hidden sm:inline">{continueLabel}</span>
                </AppButton>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <AppButton type="button" variant="ghost" onClick={onCancel}>
              Abbrechen
            </AppButton>
            <div className="flex gap-2">
              <AppButton
                type="button"
                variant="secondary"
                className="hidden sm:inline-flex"
                onClick={onPreview}
              >
                <Eye size={16} />
                Vorschau
              </AppButton>
              <AppButton
                type="button"
                onClick={onSave}
                disabled={!canSave || saving}
              >
                {saving
                  ? "Wird gespeichert …"
                  : isEditing
                    ? "Änderungen speichern"
                    : isInvoice
                      ? "Rechnung erstellen"
                      : "Angebot erstellen"}
              </AppButton>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
