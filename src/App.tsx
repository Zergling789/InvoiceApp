import { Routes, Route, Navigate, useLocation, type Location } from "react-router-dom";
import { LayoutDashboard, Users, FileText, ListTodo, Menu } from "lucide-react";

import Dashboard from "@/features/dashboard/Dashboard";
import Clients from "@/features/clients/Clients";
import Projects from "@/features/projects/Projects";
import DocumentsHubPage from "@/features/documents/DocumentsHubPage";
import DocumentDetailRoute from "@/features/documents/DocumentDetailRoute";
import OfferCreatePage from "@/features/documents/create/OfferCreatePage";
import InvoiceCreatePage from "@/features/documents/create/InvoiceCreatePage";
import CustomerCreatePage from "@/features/clients/CustomerCreatePage";
import CustomerEditPage from "@/features/clients/CustomerEditPage";
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
import PricingPage from "@/features/billing/PricingPage";
import LegalPage from "@/pages/LegalPage";
import RecipientDocumentPage from "@/pages/RecipientDocumentPage";
import { PublicLegalFooter } from "@/components/PublicLegalFooter";
import { PositionCatalogPage } from "@/features/positions/PositionCatalogPage";
import InvoiceEditPage from "@/features/documents/edit/InvoiceEditPage";
import OfferEditPage from "@/features/documents/edit/OfferEditPage";
import OnboardingPage from "@/features/onboarding/OnboardingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

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
        <Route path="/imprint" element={<LegalPage kind="imprint" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/dpa" element={<LegalPage kind="dpa" />} />
        <Route path="/subprocessors" element={<LegalPage kind="subprocessors" />} />
        <Route path="/ai-notice" element={<LegalPage kind="ai-notice" />} />
        <Route path="/contact" element={<LegalPage kind="contact" />} />
        <Route path="/recipient/:token" element={<RecipientDocumentPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell navItems={navItems} />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="todos" element={<TodosPage />} />
          <Route path="documents" element={<DocumentsHubPage />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id/edit" element={<CustomerEditPage />} />
          <Route path="projects" element={<Projects />} />
          <Route path="offers" element={<Navigate to="/app/documents?type=offer" replace />} />
          <Route path="offers/new" element={<OfferCreatePage />} />
          <Route path="offers/:id" element={<DocumentDetailRoute forcedType="offer" />} />
          <Route path="invoices" element={<Navigate to="/app/documents?type=invoice" replace />} />
          <Route path="invoices/new" element={<InvoiceCreatePage />} />
          <Route path="invoices/:id" element={<DocumentDetailRoute forcedType="invoice" />} />
          <Route path="customers/new" element={<CustomerCreatePage />} />
          <Route path="projects/new" element={<ProjectCreatePage />} />
          <Route path="documents/offer/:id/edit" element={<OfferEditPage />} />
          <Route path="documents/invoice/:id/edit" element={<InvoiceEditPage />} />
          <Route path="documents/:type/:id" element={<DocumentDetailRoute />} />
          <Route path="more" element={<MorePage />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="positions" element={<PositionCatalogPage />} />
          <Route path="plans" element={<PricingPage />} />
          <Route path="settings/email/verify" element={<VerifyEmailResult />} />

          <Route path="*" element={<NotFoundPage authenticated />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!location.pathname.startsWith("/app") && !location.pathname.startsWith("/recipient/") && <PublicLegalFooter />}

      {backgroundLocation && (
        <Routes>
          <Route path="/app/offers/new" element={<OfferCreatePage />} />
          <Route path="/app/offers/:id" element={<DocumentDetailRoute forcedType="offer" />} />
          <Route path="/app/invoices/new" element={<InvoiceCreatePage />} />
          <Route path="/app/invoices/:id" element={<DocumentDetailRoute forcedType="invoice" />} />
          <Route path="/app/customers/new" element={<CustomerCreatePage />} />
          <Route path="/app/projects/new" element={<ProjectCreatePage />} />
        </Routes>
      )}
    </>
  );
}
