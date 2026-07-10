import { useEffect, useId, useState, type CSSProperties } from "react";
import { Check, Eye, ImagePlus, Trash2, Upload } from "lucide-react";

import { downloadCompanyLogo, uploadCompanyLogo } from "@/app/settings/companyBrandingService";
import type { UserSettings } from "@/types";
import { AppButton } from "@/ui/AppButton";
import { ModalSheet } from "@/components/ui/ModalSheet";

type TemplateId = "classic" | "minimal" | "modern";
type Props = { settings: UserSettings; onChange: (settings: UserSettings) => void };

const templates: Array<{ id: TemplateId; name: string; description: string }> = [
  { id: "classic", name: "Klassisch", description: "Vertraut, sachlich und kompakt." },
  { id: "minimal", name: "Minimal", description: "Viel Weißraum und ruhige Typografie." },
  { id: "modern", name: "Modern", description: "Markanter Akzent und klare Summenfläche." },
];

function TemplateThumbnail({ id, color }: { id: TemplateId; color: string }) {
  return (
    <div className={`branding-template-preview branding-template-preview--${id}`} style={{ "--preview-accent": color } as CSSProperties}>
      <div className="branding-template-preview__brand" /><div className="branding-template-preview__title" />
      <div className="branding-template-preview__address" /><div className="branding-template-preview__line" />
      <div className="branding-template-preview__line branding-template-preview__line--short" />
      <div className="branding-template-preview__table" /><div className="branding-template-preview__total" />
    </div>
  );
}

function InvoiceLayoutPreview({ settings, template, logoUrl }: { settings: UserSettings; template: TemplateId; logoUrl: string | null }) {
  const accent = settings.primaryColor ?? "#4f46e5";
  const spacious = template === "minimal";
  const modern = template === "modern";
  return (
    <div className="min-h-full bg-[#e9eaed] p-3 sm:p-8">
      <article
        className={`mx-auto aspect-[210/297] w-full max-w-[720px] overflow-hidden bg-white text-[#1f2937] shadow-2xl ${spacious ? "p-[8%]" : "p-[6.5%]"}`}
        style={{ borderTop: modern ? `18px solid ${accent}` : undefined }}
        aria-label={`Rechnungsvorschau im Layout ${template}`}
      >
        <header className={`flex justify-between gap-6 ${spacious ? "mb-[10%]" : "mb-[7%]"}`}>
          <div className="min-w-0">
            {logoUrl && <img src={logoUrl} alt="Firmenlogo" className="mb-3 max-h-14 max-w-[180px] object-contain object-left" />}
            <div className={`${spacious ? "text-base font-medium" : "text-xl font-bold"}`}>{settings.companyName || "Musterfirma GmbH"}</div>
            <div className="mt-1 whitespace-pre-line text-[10px] leading-4 text-gray-500">{settings.address || "Musterstraße 12\n12345 Musterstadt"}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`${spacious ? "text-xl font-medium tracking-[0.18em]" : "text-2xl font-extrabold"}`} style={{ color: modern ? accent : undefined }}>RECHNUNG</div>
            <div className="mt-2 text-[10px] leading-4 text-gray-500">Nr. RE-2026-001<br />Datum: 10.07.2026<br />Fällig: 24.07.2026</div>
          </div>
        </header>
        <section className={spacious ? "mb-[10%]" : "mb-[7%]"}>
          <div className="text-[9px] text-gray-400">{settings.companyName || "Musterfirma GmbH"} · Musterstraße 12</div>
          <div className="mt-2 text-xs font-semibold">Beispielkunde AG</div><div className="text-[10px] leading-4">Ansprechpartnerin<br />Kundenweg 8<br />54321 Kundenstadt</div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold">Rechnung RE-2026-001</h2>
          <p className="mb-5 text-[10px] leading-4 text-gray-600">Vielen Dank für Ihren Auftrag. Wir berechnen folgende Leistungen:</p>
          <div className="grid grid-cols-[1fr_60px_75px_75px] border-b-2 pb-2 text-[9px] font-semibold uppercase" style={{ borderColor: modern ? accent : "#d1d5db", color: modern ? accent : undefined }}><span>Beschreibung</span><span className="text-right">Menge</span><span className="text-right">Preis</span><span className="text-right">Gesamt</span></div>
          <div className="grid grid-cols-[1fr_60px_75px_75px] border-b border-gray-200 py-3 text-[10px]"><span>Design und Entwicklung</span><span className="text-right">8 Std</span><span className="text-right">95,00 €</span><span className="text-right font-medium">760,00 €</span></div>
          <div className="grid grid-cols-[1fr_60px_75px_75px] border-b border-gray-200 py-3 text-[10px]"><span>Beratung</span><span className="text-right">2 Std</span><span className="text-right">95,00 €</span><span className="text-right font-medium">190,00 €</span></div>
          <div className="ml-auto mt-5 w-[45%] space-y-2 text-[10px]"><div className="flex justify-between"><span>Netto</span><span>950,00 €</span></div><div className="flex justify-between text-gray-500"><span>MwSt. (19%)</span><span>180,50 €</span></div><div className={`flex justify-between text-sm font-bold ${modern ? "rounded px-3 py-2 text-white" : "border-t border-gray-300 pt-2"}`} style={{ background: modern ? accent : undefined }}><span>Gesamt</span><span>1.130,50 €</span></div></div>
        </section>
        <footer className="mt-[9%] border-t border-gray-200 pt-4 text-[9px] leading-4 text-gray-500">Zahlbar innerhalb von 14 Tagen ohne Abzug.<br />{settings.bankName || "Musterbank"} · {settings.iban || "DE00 0000 0000 0000 0000 00"}</footer>
      </article>
    </div>
  );
}

export function BrandingSettingsSection({ settings, onChange }: Props) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutPreviewOpen, setLayoutPreviewOpen] = useState(false);
  const selectedTemplate = settings.templateId === "default" ? "classic" : settings.templateId ?? "classic";

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!settings.logoUrl) { setPreviewUrl(null); return () => undefined; }
    void downloadCompanyLogo(settings.logoUrl).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => { if (active) setPreviewUrl(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [settings.logoUrl]);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true); setError(null);
    try { onChange({ ...settings, logoUrl: await uploadCompanyLogo(file) }); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Logo konnte nicht hochgeladen werden."); }
    finally { setUploading(false); }
  };

  return (
    <div className="border-t border-[var(--app-border)] pt-6 space-y-6">
      <div><div className="text-base font-semibold">Branding & Dokumentdesign</div><p className="mt-1 text-sm text-[var(--app-muted)]">Logo, Akzentfarbe und Standardlayout für neue Rechnungen.</p></div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-3">
          <label htmlFor={inputId} className="text-sm font-medium">Firmenlogo</label>
          <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-black/[0.015] p-5 dark:bg-white/[0.025]">
            {previewUrl ? <img src={previewUrl} alt="Vorschau des Firmenlogos" className="max-h-24 max-w-full object-contain" /> : <div className="text-center text-[var(--app-muted)]"><ImagePlus className="mx-auto mb-2" size={28} /><div className="text-sm">Noch kein Logo hinterlegt</div></div>}
          </div>
          <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="secondary" disabled={uploading} onClick={() => document.getElementById(inputId)?.click()}><Upload size={16} />{uploading ? "Wird hochgeladen …" : settings.logoUrl ? "Logo ersetzen" : "Logo hochladen"}</AppButton>
            {settings.logoUrl && <AppButton type="button" variant="ghost" onClick={() => onChange({ ...settings, logoUrl: "" })}><Trash2 size={16} />Entfernen</AppButton>}
          </div>
          <p className="text-xs leading-5 text-[var(--app-muted)]">PNG, JPEG oder WebP · maximal 2 MB und 2000 × 1000 Pixel · empfohlen: 1200 × 400 Pixel.</p>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <div>
          <label htmlFor="branding-primary-color" className="text-sm font-medium">Akzentfarbe</label>
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--app-border)] p-4">
            <input id="branding-primary-color" type="color" className="h-11 w-14 cursor-pointer rounded border-0 bg-transparent" value={settings.primaryColor ?? "#4f46e5"} onChange={(event) => onChange({ ...settings, primaryColor: event.target.value })} />
            <div><div className="font-medium">{settings.primaryColor ?? "#4f46e5"}</div><div className="text-xs text-[var(--app-muted)]">Für Akzente und Summen</div></div>
          </div>
        </div>
      </div>
      <fieldset><legend className="text-sm font-medium">Standardlayout</legend><div className="mt-3 grid gap-3 md:grid-cols-3">
        {templates.map((template) => { const selected = selectedTemplate === template.id; return <button key={template.id} type="button" aria-pressed={selected} onClick={() => onChange({ ...settings, templateId: template.id })} className={`relative rounded-2xl border p-3 text-left transition ${selected ? "border-[var(--app-primary)] ring-2 ring-[var(--app-primary)]/15" : "border-[var(--app-border)] hover:border-[var(--app-muted)]"}`}>{selected && <span className="absolute right-5 top-5 z-10 grid h-6 w-6 place-items-center rounded-full bg-[var(--app-primary)] text-white"><Check size={14} /></span>}<TemplateThumbnail id={template.id} color={settings.primaryColor ?? "#4f46e5"} /><div className="mt-3 font-semibold">{template.name}</div><div className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{template.description}</div></button>; })}
      </div></fieldset>
      <div className="flex justify-end border-t border-[var(--app-border)] pt-5">
        <AppButton type="button" variant="secondary" onClick={() => setLayoutPreviewOpen(true)}><Eye size={17} />Rechnungsvorschau öffnen</AppButton>
      </div>
      <ModalSheet title="Rechnungsvorschau" isOpen={layoutPreviewOpen} onClose={() => setLayoutPreviewOpen(false)}>
        <InvoiceLayoutPreview settings={settings} template={selectedTemplate as TemplateId} logoUrl={previewUrl} />
      </ModalSheet>
    </div>
  );
}
