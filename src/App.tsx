import { Routes, Route, Navigate, useLocation, type Location } from "react-router-dom";
import { LayoutDashboard, Users, FileText, ListTodo, Menu } from "lucide-react";

import Dashboard from "@/features/dashboard/Dashboard";
import Clients from "@/features/clients/Clients";
import Projects from "@/features/projects/Projects";
import DocumentsPage from "@/features/documents/DocumentsPage";
import DocumentsHubPage from "@/features/documents/DocumentsHubPage";
import DocumentDetailPage from "@/features/documents/DocumentDetailPage";
import OfferCreatePage from "@/features/documents/create/OfferCreatePage";
import InvoiceCreatePage from "@/features/documents/create/InvoiceCreatePage";
import OfferEditPage from "@/features/documents/edit/OfferEditPage";
import InvoiceEditPage from "@/features/documents/edit/InvoiceEditPage";
import CustomerCreatePage from "@/features/clients/CustomerCreatePage";
import ProjectCreatePage from "@/features/projects/ProjectCreatePage";
import TodosPage from "@/features/todos/TodosPage";
import MorePage from "@/features/more/MorePage";
import SettingsView from "@/features/settings/SettingsView";
import VerifyEmailResult from "@/features/settings/VerifyEmailResult";
import AppShell from "@/components/Layout/AppShell";
import type { NavItem } from "@/components/Layout/Sidebar";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RequireAuth from "@/components/Auth/RequireAuth";
import AngebotDetails from "@/pages/AngebotDetails";

const navItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} />, end: true },
  { to: "/app/todos", label: "To-dos", icon: <ListTodo size={16} /> },
  { to: "/app/documents", label: "Dokumente", icon: <FileText size={16} /> },
  { to: "/app/clients", label: "Kunden", icon: <Users size={16} /> },
  { to: "/app/more", label: "Mehr", icon: <Menu size={16} /> },
];

export default function App() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo/angebotdetails" element={<AngebotDetails />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell navItems={navItems} />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="todos" element={<TodosPage />} />
          <Route path="documents" element={<DocumentsHubPage />} />
          <Route path="clients" element={<Clients />} />
          <Route path="projects" element={<Projects />} />
          <Route path="offers" element={<DocumentsPage type="offer" />} />
          <Route path="offers/new" element={<OfferCreatePage />} />
          <Route path="invoices" element={<DocumentsPage type="invoice" />} />
          <Route path="invoices/new" element={<InvoiceCreatePage />} />
          <Route path="customers/new" element={<CustomerCreatePage />} />
          <Route path="projects/new" element={<ProjectCreatePage />} />
          <Route path="documents/offer/:id/edit" element={<OfferEditPage />} />
          <Route path="documents/invoice/:id/edit" element={<InvoiceEditPage />} />
          <Route path="documents/:type/:id" element={<DocumentDetailPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="settings/email/verify" element={<VerifyEmailResult />} />

          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/app/offers/new" element={<OfferCreatePage />} />
          <Route path="/app/invoices/new" element={<InvoiceCreatePage />} />
          <Route path="/app/customers/new" element={<CustomerCreatePage />} />
          <Route path="/app/projects/new" element={<ProjectCreatePage />} />
        </Routes>
      )}
    </>
  );
}
