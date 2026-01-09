import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";

export function AppShell({ navItems }: { navItems: NavItem[] }) {
  const location = useLocation();
  const pathname = location.pathname;
  const hideMobileNav =
    /^\/app\/documents\/(offer|invoice)\/[^/]+(?:\/edit)?$/.test(pathname) ||
    /^\/app\/clients\/[^/]+(?:\/edit)?$/.test(pathname) ||
    /^\/app\/offers\/new$/.test(pathname) ||
    /^\/app\/invoices\/new$/.test(pathname) ||
    /^\/app\/customers\/new$/.test(pathname) ||
    /^\/app\/projects\/new$/.test(pathname);

  return (
    <div
      className={`min-h-screen-safe bg-gray-50 dark:bg-slate-950 app-shell${
        hideMobileNav ? " app-shell--no-mobile-nav" : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow dark:focus:bg-slate-900 dark:focus:text-slate-100"
      >
        Zum Inhalt springen
      </a>
      <Topbar />

      <div className="app-container">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6">
          <div className="hidden md:block">
            <Sidebar items={navItems} />
          </div>

          <main id="main-content" className="app-card min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <MobileNav items={navItems} hidden={hideMobileNav} />
    </div>
  );
}

export default AppShell;
