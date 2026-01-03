import { Routes, Route, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, FileText, Receipt } from "lucide-react";

import Dashboard from "@/features/dashboard/Dashboard";
import Clients from "@/features/clients/Clients";
import Projects from "@/features/projects/Projects";
import DocumentsPage from "@/features/documents/DocumentsPage";
import SettingsView from "@/features/settings/SettingsView";
import VerifyEmailResult from "@/features/settings/VerifyEmailResult";
import AppShell from "@/components/Layout/AppShell";
import type { NavItem } from "@/components/Layout/Sidebar";
import AngebotDetailsPage from "@/pages/AngebotDetailsPage";
import LoginPage from "@/pages/LoginPage";
import RequireAuth from "@/components/Auth/RequireAuth";

const navItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} />, end: true },
  { to: "/app/clients", label: "Kunden", icon: <Users size={16} /> },
  { to: "/app/projects", label: "Projekte", icon: <FolderKanban size={16} /> },
  { to: "/app/offers", label: "Angebote", icon: <FileText size={16} /> },
  { to: "/app/invoices", label: "Rechnungen", icon: <Receipt size={16} /> },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AngebotDetailsPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell navItems={navItems} />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="projects" element={<Projects />} />
        <Route path="offers" element={<DocumentsPage type="offer" />} />
        <Route path="invoices" element={<DocumentsPage type="invoice" />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="settings/email/verify" element={<VerifyEmailResult />} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
