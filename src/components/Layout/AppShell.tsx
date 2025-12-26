import { Outlet } from "react-router-dom";
import { Sidebar, type NavItem } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ navItems }: { navItems: NavItem[] }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <Sidebar items={navItems} />

        <main className="bg-white border rounded-lg p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
