import { NavLink, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, FileText, Receipt, Settings } from "lucide-react";

import Dashboard from "@/features/dashboard/Dashboard";
import Clients from "@/features/clients/Clients";
import Projects from "@/features/projects/Projects";
import DocumentsPage from "@/features/documents/DocumentsPage";
import SettingsView from "@/features/settings/SettingsView";

function Shell() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
      isActive ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100",
    ].join(" ");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-gray-900">FreelanceFlow</div>
          <nav className="flex items-center gap-2">
            <NavLink to="/settings" className={linkClass}>
              <Settings size={16} /> Einstellungen
            </NavLink>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white border rounded-lg p-3 h-fit">
          <div className="text-xs font-semibold text-gray-500 px-3 py-2">Navigation</div>

          <div className="space-y-1">
            <NavLink to="/" end className={linkClass}>
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>

            <NavLink to="/clients" className={linkClass}>
              <Users size={16} /> Kunden
            </NavLink>

            <NavLink to="/projects" className={linkClass}>
              <FolderKanban size={16} /> Projekte
            </NavLink>

            <NavLink to="/offers" className={linkClass}>
              <FileText size={16} /> Angebote
            </NavLink>

            <NavLink to="/invoices" className={linkClass}>
              <Receipt size={16} /> Rechnungen
            </NavLink>
          </div>
        </aside>

        <main className="bg-white border rounded-lg p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
      <p className="text-gray-600">
        Diese Seite ist noch nicht verdrahtet. Wenn du schon eine Settings-Komponente hast, ersetz
        einfach diesen Placeholder.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/offers" element={<DocumentsPage type="offer" />} />
        <Route path="/invoices" element={<DocumentsPage type="invoice" />} />
        <Route path="/settings" element={<SettingsView />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
