import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, type Location } from "react-router-dom";
import { BriefcaseBusiness, FileText, LayoutDashboard, ListTodo, Menu, PackageSearch, ReceiptText, Users } from "lucide-react";

import AppShell from "@/components/Layout/AppShell";
import type { NavItem } from "@/components/Layout/Sidebar";
import RequireAuth from "@/components/Auth/RequireAuth";
import { PublicLegalFooter } from "@/components/PublicLegalFooter";

const Dashboard = lazy(() => import("@/features/dashboard/Dashboard"));
const Clients = lazy(() => import("@/features/clients/Clients"));
const Projects = lazy(() => import("@/features/projects/Projects"));
const DocumentsHubPage = lazy(() => import("@/features/documents/DocumentsHubPage"));
const DocumentDetailRoute = lazy(() => import("@/features/documents/DocumentDetailRoute"));
const OfferCreatePage = lazy(() => import("@/features/documents/create/OfferCreatePage"));
const InvoiceCreatePage = lazy(() => import("@/features/documents/create/InvoiceCreatePage"));
const CustomerCreatePage = lazy(() => import("@/features/clients/CustomerCreatePage"));
const CustomerEditPage = lazy(() => import("@/features/clients/CustomerEditPage"));
const ProjectCreatePage = lazy(() => import("@/features/projects/ProjectCreatePage"));
const ProjectDetailPage = lazy(() => import("@/features/projects/ProjectDetailPage"));
const TodosPage = lazy(() => import("@/features/todos/TodosPage"));
const MorePage = lazy(() => import("@/features/more/MorePage"));
const SettingsView = lazy(() => import("@/features/settings/SettingsView"));
const VerifyEmailResult = lazy(() => import("@/features/settings/VerifyEmailResult"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const AngebotDetails = lazy(() => import("@/pages/AngebotDetails"));
const PricingPage = lazy(() => import("@/features/billing/PricingPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const RecipientDocumentPage = lazy(() => import("@/pages/RecipientDocumentPage"));
const InvoiceEditPage = lazy(() => import("@/features/documents/edit/InvoiceEditPage"));
const OfferEditPage = lazy(() => import("@/features/documents/edit/OfferEditPage"));
const OnboardingPage = lazy(() => import("@/features/onboarding/OnboardingPage"));
const PositionCatalogPage = lazy(() =>
  import("@/features/positions/PositionCatalogPage").then((module) => ({
    default: module.PositionCatalogPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

const navItems: NavItem[] = [
  { to: "/app", label: "Übersicht", icon: <LayoutDashboard size={16} />, end: true },
  { to: "/app/projects", label: "Projekte", icon: <BriefcaseBusiness size={16} /> },
  { to: "/app/clients", label: "Kunden", icon: <Users size={16} /> },
  { to: "/app/todos", label: "Aufgaben", icon: <ListTodo size={16} /> },
  { to: "/app/documents?type=offer", search: "?type=offer", label: "Angebote", icon: <FileText size={16} /> },
  { to: "/app/documents?type=invoice", search: "?type=invoice", label: "Rechnungen", icon: <ReceiptText size={16} /> },
  { to: "/app/positions", label: "Produkte", icon: <PackageSearch size={16} /> },
  { to: "/app/more", label: "Mehr", icon: <Menu size={16} /> },
];

export default function App() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | null;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <Suspense fallback={<div role="status" className="grid min-h-screen-safe place-items-center bg-[var(--app-bg)] p-6 text-sm text-[var(--app-muted)]">Seite wird geladen …</div>}>
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
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
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
    </Suspense>
  );
}
