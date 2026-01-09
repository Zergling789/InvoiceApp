import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

export function Sidebar({ items }: { items: NavItem[] }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium min-h-[44px]",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60",
      isActive
        ? "bg-indigo-600 text-white"
        : "text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800",
    ].join(" ");

  return (
    <aside className="bg-white border rounded-lg p-3 h-fit dark:bg-slate-900 dark:border-slate-800">
      <div className="text-xs font-semibold text-gray-500 px-3 py-2 dark:text-slate-400">
        Navigation
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.icon} {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
