import { useState } from "react";
import { Check, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { AppBadge } from "@/ui/AppBadge";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useToast } from "@/ui/FeedbackProvider";

type BillingCycle = "monthly" | "yearly";

const plans = [
  {
    name: "Basis",
    description: "Für den Einstieg und gelegentliche Aufträge.",
    monthly: 0,
    yearly: 0,
    current: true,
    features: ["5 Dokumente pro Monat", "Kundenverwaltung", "PDF-Export", "3 KI-Entwürfe pro Monat"],
  },
  {
    name: "Solo",
    description: "Für Selbstständige mit regelmäßigem Geschäft.",
    monthly: 9,
    yearly: 90,
    recommended: true,
    features: ["Unbegrenzte Rechnungen und Angebote", "Eigenes Logo und alle Layouts", "E-Mail-Versand", "30 KI-Entwürfe pro Monat", "Zahlungserinnerungen"],
  },
  {
    name: "Pro",
    description: "Für wachsende Unternehmen und hohe Auslastung.",
    monthly: 19,
    yearly: 190,
    features: ["Alle Funktionen aus Solo", "150 KI-Entwürfe pro Monat", "Mahnstufen und Automationen", "Datenexport und Audit-Verlauf", "Priorisierter Support"],
  },
] as const;

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const toast = useToast();

  const handleUpgrade = (plan: string) => {
    toast.info(`${plan} ist vorbereitet. Der sichere Checkout wird nach der Stripe-Konfiguration aktiviert.`);
  };

  return (
    <div className="space-y-10 pb-10">
      <section className="mx-auto max-w-3xl text-center">
        <AppBadge color="blue">Transparent & jederzeit kündbar</AppBadge>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-[var(--app-text)] sm:text-5xl">Ein Tarif, der mit deinem Geschäft wächst.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--app-muted)]">Starte kostenlos und wechsle erst, wenn FreelanceFlow dir regelmäßig Arbeit abnimmt. Keine Einrichtungsgebühr, keine lange Vertragsbindung.</p>
        <div className="mt-7 inline-flex rounded-full border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-1 shadow-sm" aria-label="Abrechnungszeitraum">
          <button type="button" onClick={() => setCycle("monthly")} className={`min-h-10 rounded-full px-5 text-sm font-semibold transition ${cycle === "monthly" ? "bg-[var(--app-primary)] text-white" : "text-[var(--app-muted)]"}`}>Monatlich</button>
          <button type="button" onClick={() => setCycle("yearly")} className={`min-h-10 rounded-full px-5 text-sm font-semibold transition ${cycle === "yearly" ? "bg-[var(--app-primary)] text-white" : "text-[var(--app-muted)]"}`}>Jährlich <span className="ml-1 text-xs opacity-80">2 Monate gratis</span></button>
        </div>
      </section>

      <section className="grid items-stretch gap-5 lg:grid-cols-3" aria-label="Tarife">
        {plans.map((plan) => {
          const price = cycle === "yearly" ? plan.yearly : plan.monthly;
          const monthlyEquivalent = cycle === "yearly" && price > 0 ? price / 12 : price;
          return (
            <AppCard key={plan.name} className={`relative flex h-full flex-col p-6 sm:p-7 ${"recommended" in plan && plan.recommended ? "border-[var(--app-primary)] shadow-[0_18px_50px_rgba(0,113,227,0.13)] ring-1 ring-[var(--app-primary)]/20" : ""}`}>
              {"recommended" in plan && plan.recommended && <div className="absolute -top-3 left-6 rounded-full bg-[var(--app-primary)] px-3 py-1 text-xs font-semibold text-white">Am beliebtesten</div>}
              <div><div className="text-xl font-semibold">{plan.name}</div><p className="mt-2 min-h-12 text-sm leading-6 text-[var(--app-muted)]">{plan.description}</p></div>
              <div className="mt-6"><span className="text-4xl font-semibold tracking-[-0.04em]">{monthlyEquivalent.toLocaleString("de-DE", { maximumFractionDigits: 2 })} €</span><span className="text-sm text-[var(--app-muted)]"> / Monat</span>{cycle === "yearly" && price > 0 && <div className="mt-1 text-xs text-[var(--app-muted)]">{price} € jährlich · zzgl. MwSt.</div>}{price === 0 && <div className="mt-1 text-xs text-[var(--app-muted)]">dauerhaft kostenlos</div>}</div>
              <div className="my-6 h-px bg-[var(--app-border)]" />
              <ul className="flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm"><Check size={17} className="mt-0.5 shrink-0 text-emerald-500" /><span>{feature}</span></li>)}</ul>
              <AppButton type="button" variant={"recommended" in plan && plan.recommended ? "primary" : "secondary"} className="mt-7 w-full" disabled={"current" in plan && plan.current} onClick={() => handleUpgrade(plan.name)}>{"current" in plan && plan.current ? "Aktueller Tarif" : `${plan.name} wählen`}</AppButton>
            </AppCard>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AppCard className="p-5"><ShieldCheck size={21} className="text-[var(--app-primary)]" /><h2 className="mt-3 font-semibold">Sicher bezahlen</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Der Checkout wird über Stripe abgewickelt; Zahlungsdaten werden nicht in FreelanceFlow gespeichert.</p></AppCard>
        <AppCard className="p-5"><Zap size={21} className="text-[var(--app-primary)]" /><h2 className="mt-3 font-semibold">Sofort wechseln</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Upgrades gelten sofort. Downgrades werden zum Ende des Abrechnungszeitraums wirksam.</p></AppCard>
        <AppCard className="p-5"><Sparkles size={21} className="text-[var(--app-primary)]" /><h2 className="mt-3 font-semibold">Faire KI-Limits</h2><p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Planbare Kontingente schützen vor überraschenden Kosten und können später erweitert werden.</p></AppCard>
      </section>

      <p className="text-center text-xs leading-5 text-[var(--app-muted)]">Die Tarifseite ist vorbereitet. Kostenpflichtige Buchungen werden erst nach Einrichtung von Stripe Checkout, Webhooks, Steuerregeln und Kundenportal aktiviert.</p>
    </div>
  );
}
