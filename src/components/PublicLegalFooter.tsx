import { Link } from "react-router-dom";

const links = [["/imprint", "Impressum"], ["/privacy", "Datenschutz"], ["/terms", "Bedingungen"], ["/dpa", "AVV"], ["/subprocessors", "Unterauftragnehmer"], ["/ai-notice", "KI-Hinweise"], ["/contact", "Kontakt"]] as const;

export function PublicLegalFooter() {
  return <footer className="border-t border-[var(--app-border)] bg-[var(--app-surface-solid)] px-6 py-6 print:hidden"><nav aria-label="Rechtliche Informationen" className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[var(--app-muted)]">{links.map(([to, label]) => <Link key={to} to={to} className="hover:text-[var(--app-text)]">{label}</Link>)}</nav></footer>;
}
