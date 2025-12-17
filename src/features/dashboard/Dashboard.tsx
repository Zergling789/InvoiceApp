// src/features/dashboard/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { AppCard } from "@/ui/AppCard";
import { AppButton } from "@/ui/AppButton";

import { dbListClients } from "@/db/clientsDb";
import { dbGetSettings } from "@/db/settingsDb";
import { dbListOffers } from "@/db/offersDb";
import { dbListInvoices } from "@/db/invoicesDb";

import type { UserSettings } from "@/types";
import { OfferStatus, InvoiceStatus } from "@/types";

export default function Dashboard() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [clientCount, setClientCount] = useState(0);
  const [openOffers, setOpenOffers] = useState(0);
  const [openInvoices, setOpenInvoices] = useState(0);
  const [overdueInvoices, setOverdueInvoices] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [s, clients, offers, invoices] = await Promise.all([
          dbGetSettings(),
          dbListClients(),
          dbListOffers(),
          dbListInvoices(),
        ]);

        setSettings(s);
        setClientCount(clients.length);

        // "Offen" bei Angeboten = nicht accepted/rejected
        const openOfferCount = offers.filter(
          (o) => o.status !== OfferStatus.REJECTED && o.status !== OfferStatus.INVOICED
        ).length;

        setOpenOffers(openOfferCount);

        // "Offen" bei Rechnungen = nicht paid
        const openInvoiceCount = invoices.filter((i) => i.status !== InvoiceStatus.PAID).length;
        setOpenInvoices(openInvoiceCount);

        // "Überfällig" = nicht paid + dueDate < heute
        const overdueCount = invoices.filter((i) => {
          if (i.status === InvoiceStatus.PAID) return false;
          const due = i.dueDate ? new Date(i.dueDate) : null;
          return !!due && due.getTime() < today.getTime();
        }).length;
        setOverdueInvoices(overdueCount);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          {settings?.companyName ? `Hallo ${settings.companyName}` : "Willkommen zurück."}
        </p>
        {error && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppCard>
          <div className="text-sm text-gray-500">Kunden</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "…" : clientCount}</div>
          <div className="mt-4">
            <Link to="/clients">
              <AppButton variant="secondary">Zu den Kunden</AppButton>
            </Link>
          </div>
        </AppCard>

        <AppCard>
          <div className="text-sm text-gray-500">Angebote (offen)</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "…" : openOffers}</div>
          <div className="mt-4">
            <Link to="/offers">
              <AppButton variant="secondary">Zu den Angeboten</AppButton>
            </Link>
          </div>
        </AppCard>

        <AppCard>
          <div className="text-sm text-gray-500">Rechnungen (offen)</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "…" : openInvoices}</div>
          <div className="mt-2 text-sm text-gray-600">
            {loading ? "…" : `Überfällig: ${overdueInvoices}`}
          </div>
          <div className="mt-4">
            <Link to="/invoices">
              <AppButton variant="secondary">Zu den Rechnungen</AppButton>
            </Link>
          </div>
        </AppCard>
      </div>

      <AppCard className="bg-gray-50">
        <div className="flex flex-wrap gap-2">
          <Link to="/projects">
            <AppButton>Projekte</AppButton>
          </Link>
          <Link to="/settings">
            <AppButton variant="secondary">Einstellungen</AppButton>
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
