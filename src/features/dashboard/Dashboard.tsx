import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppCard } from "@/ui/AppCard";
import { AppButton } from "@/ui/AppButton";

import { loadDashboardKpis } from "@/app/dashboard/dashboardService";
import { fetchSettings } from "@/app/settings/settingsService";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [openOffers, setOpenOffers] = useState(0);
  const [openInvoices, setOpenInvoices] = useState(0);
  const [overdueInvoices, setOverdueInvoices] = useState(0);
  const [company, setCompany] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [kpis, settings] = await Promise.all([loadDashboardKpis(), fetchSettings()]);
        setClientCount(kpis.clientCount);
        setOpenOffers(kpis.openOffers);
        setOpenInvoices(kpis.openInvoices);
        setOverdueInvoices(kpis.overdueInvoices);
        setCompany(settings.companyName || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">{company ? `Hallo ${company}` : "Willkommen zurück."}</p>
        {error && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppCard>
          <div className="text-sm text-gray-500">Kunden</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "…" : clientCount}</div>
          <div className="mt-4">
            <Link to="/app/clients">
              <AppButton variant="secondary">Zu den Kunden</AppButton>
            </Link>
          </div>
        </AppCard>

        <AppCard>
          <div className="text-sm text-gray-500">Angebote (offen)</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "…" : openOffers}</div>
          <div className="mt-4">
            <Link to="/app/offers">
              <AppButton variant="secondary">Zu den Angeboten</AppButton>
            </Link>
          </div>
        </AppCard>

        <AppCard>
          <div className="text-sm text-gray-500">Rechnungen (offen)</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "…" : openInvoices}</div>
          <div className="mt-2 text-sm text-gray-600">{loading ? "…" : `Überfällig: ${overdueInvoices}`}</div>
          <div className="mt-4">
            <Link to="/app/invoices">
              <AppButton variant="secondary">Zu den Rechnungen</AppButton>
            </Link>
          </div>
        </AppCard>
      </div>

      <AppCard className="bg-gray-50">
        <div className="text-sm text-gray-600">Weitere Bereiche findest du in der Seitenleiste.</div>
      </AppCard>
    </div>
  );
}
