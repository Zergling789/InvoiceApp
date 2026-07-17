import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, MapPin, Plus, ScanLine, Search, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useClients } from "@/app/clients/clientQueries";
import { getClientDisplayName, getClientPersonName } from "@/domain/models/Client";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";

function searchableClientText(client: Parameters<typeof getClientDisplayName>[0] & {
  customerNumber?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  city?: string;
}) {
  return [
    getClientDisplayName(client),
    getClientPersonName(client),
    client.customerNumber,
    client.email,
    client.phone,
    client.mobile,
    client.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("de-DE");
}

export default function Clients() {
  const { clients, loading, error, refresh } = useClients();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refreshToken = (location.state as { refreshDocuments?: number } | null)?.refreshDocuments;
    if (!refreshToken) return;
    void refresh();
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: {},
    });
  }, [location.hash, location.pathname, location.search, location.state, navigate, refresh]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
    if (!normalizedQuery) return clients;
    return clients.filter((client) => searchableClientText(client).includes(normalizedQuery));
  }, [clients, query]);

  const createClient = (scanBusinessCard = false) => {
    navigate("/app/customers/new", {
      state: { backgroundLocation: location, ...(scanBusinessCard ? { scanBusinessCard: true } : {}) },
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="app-eyebrow">Stammdaten</div>
          <h1 className="mt-1 text-2xl font-bold">Kunden</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Kontaktdaten einmal speichern und in Dokumenten wiederverwenden.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <AppButton variant="secondary" onClick={() => createClient(true)} className="w-full justify-center sm:w-auto"><ScanLine size={16} /> Visitenkarte scannen</AppButton>
          <AppButton onClick={() => createClient()} className="w-full justify-center sm:w-auto"><Plus size={16} /> Neuer Kunde</AppButton>
        </div>
      </header>

      {error && <AppCard className="border-red-500/30 bg-red-500/5 p-5"><div className="font-semibold text-red-700 dark:text-red-300">Kunden konnten nicht geladen werden.</div><p className="mt-1 text-sm text-[var(--app-muted)]">Prüfe deine Verbindung und versuche es erneut.</p><AppButton variant="secondary" className="mt-4" onClick={() => void refresh()}>Erneut versuchen</AppButton></AppCard>}

      {!error && (clients.length > 0 || query) && (
        <label className="relative block">
          <span className="sr-only">Kunden durchsuchen</span>
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]" />
          <input className="app-input w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Firma, E-Mail oder Ort suchen" />
        </label>
      )}

      {loading ? (
        <AppCard className="p-6 text-sm text-[var(--app-muted)]">Kunden werden geladen …</AppCard>
      ) : !error && clients.length === 0 ? (
        <AppCard className="grid justify-items-center p-8 text-center sm:p-12">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]"><UserRound size={25} /></span>
          <h2 className="mt-4 text-lg font-semibold">Noch keine Kunden</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--app-muted)]">Lege deinen ersten Kunden an. Danach stehen die Daten direkt für Angebote und Rechnungen bereit.</p>
          <AppButton className="mt-5" onClick={() => createClient()}><Plus size={17} /> Ersten Kunden anlegen</AppButton>
        </AppCard>
      ) : !error && filteredClients.length === 0 ? (
        <AppCard className="p-8 text-center"><h2 className="font-semibold">Kein Kunde gefunden</h2><p className="mt-1 text-sm text-[var(--app-muted)]">Prüfe den Suchbegriff oder lösche die Suche.</p><AppButton variant="secondary" className="mt-4" onClick={() => setQuery("")}>Suche löschen</AppButton></AppCard>
      ) : !error ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => {
            const personName = getClientPersonName(client);
            const address = [[client.street, client.houseNumber].filter(Boolean).join(" "), [client.postalCode, client.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || client.address;
            return (
              <button key={client.id} type="button" onClick={() => navigate(`/app/clients/${client.id}/edit`)} className="rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]">
                <AppCard className="h-full p-5 transition hover:border-[var(--app-primary)]/50 hover:bg-[var(--app-primary)]/[0.025]">
                  <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--app-primary)]/10 text-[var(--app-primary)]">{client.companyName ? <Building2 size={18} /> : <UserRound size={18} />}</span><div className="min-w-0"><h2 className="truncate font-semibold">{getClientDisplayName(client)}</h2>{client.companyName && personName && <p className="truncate text-sm text-[var(--app-muted)]">{personName}</p>}{client.customerNumber && <p className="mt-1 text-xs text-[var(--app-muted)]">Kundennr. {client.customerNumber}</p>}</div></div>
                  <div className="mt-4 space-y-2 text-sm text-[var(--app-muted)]">{client.email && <div className="flex min-w-0 gap-2"><Mail size={15} className="mt-0.5 shrink-0" /><span className="truncate">{client.email}</span></div>}{address && <div className="flex min-w-0 gap-2"><MapPin size={15} className="mt-0.5 shrink-0" /><span className="line-clamp-2">{address}</span></div>}{!client.email && !address && <span>Noch keine Kontaktdaten hinterlegt</span>}</div>
                  <div className="mt-5 text-sm font-semibold text-[var(--app-primary)]">Kunde öffnen</div>
                </AppCard>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
