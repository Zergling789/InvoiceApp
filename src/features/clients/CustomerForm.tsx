import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Mail, MoreVertical, Phone, UserRound } from "lucide-react";

import type { Client } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { ActionSheet } from "@/components/ui/ActionSheet";
import BottomActionBar from "@/components/BottomActionBar";
import { getClientDisplayName, getClientPersonName } from "@/domain/models/Client";

type CustomerFormProps = { value: Client; initialValue: Client; onChange: (next: Client) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void; isExisting: boolean; isBusy?: boolean; showHeader?: boolean; onDirtyChange?: (dirty: boolean) => void };
type TextKey = "companyName" | "contactPerson" | "email" | "customerNumber" | "firstName" | "lastName" | "jobTitle" | "department" | "phone" | "mobile" | "website" | "street" | "houseNumber" | "addressAddition" | "postalCode" | "city" | "state" | "country" | "legalForm" | "industry" | "vatId" | "taxNumber" | "registrationNumber" | "invoiceEmail" | "source";
const inputClass = "mt-1 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-solid)] px-3 py-2.5 text-sm";

function Section({ title, summary, children, open = false }: { title: string; summary: string; children: React.ReactNode; open?: boolean }) {
  return <details className="group overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-solid)]" open={open}><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5"><div><div className="font-semibold">{title}</div><div className="mt-0.5 text-xs text-[var(--app-muted)]">{summary}</div></div><ChevronDown size={17} className="shrink-0 text-[var(--app-muted)] transition-transform group-open:rotate-180" /></summary><div className="border-t border-[var(--app-border)] p-4 sm:p-5">{children}</div></details>;
}

export function CustomerForm({ value, initialValue, onChange, onSave, onCancel, onDelete, isExisting, isBusy = false, showHeader = true, onDirtyChange }: CustomerFormProps) {
  const [showActions, setShowActions] = useState(false);
  const isDirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(initialValue), [initialValue, value]);
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const textField = (label: string, key: TextKey, options?: { type?: string; required?: boolean; placeholder?: string }) => <label className="text-sm font-medium">{label}{options?.required ? " *" : ""}<input type={options?.type ?? "text"} required={options?.required} className={inputClass} value={String(value[key] ?? "")} placeholder={options?.placeholder} onChange={(event) => onChange({ ...value, [key]: event.target.value })} /></label>;
  const contactName = getClientPersonName(value) || "Keine Kontaktperson";
  const displayName = getClientDisplayName(value);
  const requiredNamesComplete = Boolean(value.firstName?.trim() && value.lastName?.trim());
  const structuredAddress = [[value.street, value.houseNumber].filter(Boolean).join(" "), value.addressAddition, [value.postalCode, value.city].filter(Boolean).join(" "), value.state, value.country].filter(Boolean).join("\n");
  const displayAddress = structuredAddress || value.address || "Keine Adresse hinterlegt";
  const initials = (contactName !== "Keine Kontaktperson" ? contactName : displayName).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "K";

  return <div className="space-y-5 bottom-action-spacer">
    {showHeader && <header className="flex items-start justify-between gap-3"><div><div className="app-eyebrow">Kundenakte</div><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">{isExisting ? value.companyName || "Kunde bearbeiten" : "Neuer Kunde"}</h2><p className="mt-1 text-sm text-[var(--app-muted)]">{value.customerNumber || "Noch keine Kundennummer"} · {isDirty ? "Ungespeicherte Änderungen" : "Alle Änderungen gespeichert"}</p></div>{isExisting && onDelete && <AppButton variant="ghost" onClick={() => setShowActions(true)}><MoreVertical size={16} />Mehr</AppButton>}</header>}
    <ActionSheet isOpen={showActions} onClose={() => setShowActions(false)} title="Kundenaktionen" actions={[{ label: "Löschen", variant: "danger", onSelect: () => { setShowActions(false); onDelete?.(); } }]} />

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <main className="min-w-0 space-y-4">
        <AppCard className="overflow-hidden p-0"><div className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4"><UserRound size={18} /><div><div className="font-semibold">Kontakt</div><div className="text-xs text-[var(--app-muted)]">Name und Erreichbarkeit</div></div></div><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {textField("Vorname", "firstName", { required: true })}{textField("Nachname", "lastName", { required: true })}{textField("Firma", "companyName")}
          {textField("E-Mail", "email", { type: "email" })}{textField("Telefon", "phone", { type: "tel" })}
          <details className="group sm:col-span-2 lg:col-span-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] px-3 py-2 text-sm font-medium"><span>Weitere Kontaktdaten</span><ChevronDown size={17} className="shrink-0 text-[var(--app-muted)] transition-transform group-open:rotate-180" /></summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{textField("Kundennummer", "customerNumber")}{textField("Kontaktperson", "contactPerson")}{textField("Position", "jobTitle")}{textField("Abteilung", "department")}{textField("Mobil", "mobile", { type: "tel" })}{textField("Webseite", "website", { type: "url", placeholder: "https://" })}</div>
          </details>
        </div></AppCard>

        <Section title="Adresse" summary={displayAddress.replace(/\n/g, ", ")} open={!value.address && !structuredAddress}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="sm:col-span-2">{textField("Straße", "street")}</div>{textField("Hausnummer", "houseNumber")}{textField("Adresszusatz", "addressAddition")}{textField("PLZ", "postalCode")}{textField("Ort", "city")}{textField("Bundesland", "state")}{textField("Land", "country")}</div>
          <div className="mt-4 rounded-xl bg-black/[0.025] p-3 text-xs leading-5 text-[var(--app-muted)] dark:bg-white/[0.04]"><div className="font-semibold text-[var(--app-text)]">Dokumentvorschau</div><div className="mt-1 whitespace-pre-line">{value.companyName ? `${value.companyName}\n` : ""}{contactName !== "Keine Kontaktperson" ? `${contactName}\n` : ""}{displayAddress}</div></div>
          {value.address && !structuredAddress && <label className="mt-4 block text-sm font-medium">Bestehende kombinierte Adresse<textarea rows={3} className={inputClass} value={value.address} onChange={(event) => onChange({ ...value, address: event.target.value })} /></label>}
        </Section>

        <Section title="Unternehmen" summary={[value.vatId, value.industry, value.legalForm].filter(Boolean).join(" · ") || "Noch nicht konfiguriert"}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{textField("Rechtsform", "legalForm")}{textField("Branche", "industry")}{textField("USt-IdNr.", "vatId")}{textField("Steuernummer", "taxNumber")}{textField("Handelsregisternummer", "registrationNumber")}</div></Section>

        <Section title="Abrechnung" summary={[value.paymentTermsDays != null && `${value.paymentTermsDays} Tage`, value.currency, value.defaultVatRate != null && `${value.defaultVatRate} %`].filter(Boolean).join(" · ") || "Noch nicht konfiguriert"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {textField("Rechnungs-E-Mail", "invoiceEmail", { type: "email" })}
            <label className="text-sm font-medium">Zahlungsziel<input type="number" min="0" max="365" className={inputClass} value={value.paymentTermsDays ?? ""} onChange={(event) => onChange({ ...value, paymentTermsDays: event.target.value === "" ? null : Number(event.target.value) })} /></label>
            <label className="text-sm font-medium">Währung<select className={inputClass} value={value.currency ?? ""} onChange={(event) => onChange({ ...value, currency: event.target.value })}><option value="">App-Standard (EUR)</option>{value.currency && value.currency !== "EUR" && <option value={value.currency} disabled>Nicht unterstützt ({value.currency})</option>}<option value="EUR">EUR – Euro</option></select>{value.currency && value.currency !== "EUR" && <span className="mt-1 block text-xs text-amber-700">Bitte auf EUR umstellen.</span>}</label>
            <label className="text-sm font-medium">Standard-MwSt.<select className={inputClass} value={value.defaultVatRate ?? ""} onChange={(event) => onChange({ ...value, defaultVatRate: event.target.value === "" ? null : Number(event.target.value) })}><option value="">App-Standard</option>{value.defaultVatRate != null && ![7, 19].includes(value.defaultVatRate) && <option value={value.defaultVatRate} disabled>Nicht unterstützt ({value.defaultVatRate} %)</option>}<option value="19">19 % – Regelsteuer</option><option value="7">7 % – Ermäßigte Steuer</option></select>{value.defaultVatRate != null && ![7, 19].includes(value.defaultVatRate) && <span className="mt-1 block text-xs text-amber-700">Bitte 19 % oder 7 % auswählen.</span>}</label>
            <label className="text-sm font-medium">Versandweg<select className={inputClass} value={value.preferredDeliveryMethod ?? "email"} onChange={(event) => onChange({ ...value, preferredDeliveryMethod: event.target.value as Client["preferredDeliveryMethod"] })}><option value="email">E-Mail</option><option value="download">Download</option><option value="post">Post</option></select></label>
            <label className="text-sm font-medium">Sprache<select className={inputClass} value={value.preferredLanguage ?? "de"} onChange={(event) => onChange({ ...value, preferredLanguage: event.target.value })}>{value.preferredLanguage && value.preferredLanguage !== "de" && <option value={value.preferredLanguage} disabled>Nicht unterstützt ({value.preferredLanguage})</option>}<option value="de">Deutsch</option></select>{value.preferredLanguage && value.preferredLanguage !== "de" && <span className="mt-1 block text-xs text-amber-700">Dokumente werden derzeit nur auf Deutsch erstellt.</span>}</label>
            <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Abweichende Rechnungsadresse<textarea rows={3} className={inputClass} value={value.billingAddress ?? ""} onChange={(event) => onChange({ ...value, billingAddress: event.target.value })} /></label>
          </div>
        </Section>

        <Section title="Organisation" summary={[value.tags?.length && `${value.tags.length} Stichwörter`, value.source && `Quelle: ${value.source}`].filter(Boolean).join(" · ") || "Noch nicht konfiguriert"}><div className="grid gap-4 sm:grid-cols-2">{textField("Kontaktquelle", "source")}<label className="text-sm font-medium">Stichwörter<input className={inputClass} value={(value.tags ?? []).join(", ")} placeholder="VIP, Empfehlung, Agentur" onChange={(event) => onChange({ ...value, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label><label className="text-sm font-medium">Letzter Kontakt<input type="datetime-local" className={inputClass} value={value.lastContactAt?.slice(0, 16) ?? ""} onChange={(event) => onChange({ ...value, lastContactAt: event.target.value || null })} /></label><label className="text-sm font-medium">Nächste Nachfrage<input type="datetime-local" className={inputClass} value={value.nextFollowUpAt?.slice(0, 16) ?? ""} onChange={(event) => onChange({ ...value, nextFollowUpAt: event.target.value || null })} /></label></div></Section>

        <Section title="Notizen" summary={value.notes ? value.notes.slice(0, 90) : "Keine internen Notizen"}><label className="text-sm font-medium">Interne Notizen<textarea rows={5} className={inputClass} value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} /></label></Section>
      </main>

      <aside className="xl:sticky xl:top-4"><AppCard className="p-5"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--app-primary)]/10 font-semibold text-[var(--app-primary)]">{initials}</div><div className="min-w-0"><div className="truncate font-semibold">{contactName}</div><div className="truncate text-sm text-[var(--app-muted)]">{value.jobTitle || value.companyName || "Neuer Kontakt"}</div></div></div><div className="mt-5 space-y-3 text-sm"><div className="flex gap-3"><Building2 size={16} className="mt-0.5 text-[var(--app-muted)]" /><span>{value.companyName || "Keine Firma"}</span></div><div className="flex gap-3"><Mail size={16} className="mt-0.5 text-[var(--app-muted)]" /><span className="break-all">{value.email || "Keine E-Mail"}</span></div><div className="flex gap-3"><Phone size={16} className="mt-0.5 text-[var(--app-muted)]" /><span>{value.phone || value.mobile || "Keine Telefonnummer"}</span></div></div><div className="mt-5 flex gap-2">{value.email && <a className="flex-1" href={`mailto:${value.email}`}><AppButton type="button" variant="secondary" className="w-full">E-Mail</AppButton></a>}{(value.phone || value.mobile) && <a className="flex-1" href={`tel:${value.phone || value.mobile}`}><AppButton type="button" variant="secondary" className="w-full">Anrufen</AppButton></a>}</div><div className="mt-5 border-t border-[var(--app-border)] pt-4"><div className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Adresse</div><div className="mt-2 whitespace-pre-line text-sm leading-6">{displayAddress}</div></div></AppCard></aside>
    </div>

    <BottomActionBar primaryLabel="Änderungen speichern" onPrimary={onSave} primaryDisabled={isBusy || !requiredNamesComplete} loading={isBusy} secondaryLabel="Abbrechen" onSecondary={onCancel} />
  </div>;
}

export default CustomerForm;
