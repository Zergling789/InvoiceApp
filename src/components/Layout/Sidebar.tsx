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
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium",
      isActive ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100",
    ].join(" ");

  return (
    <aside className="bg-white border rounded-lg p-3 h-fit">
      <div className="text-xs font-semibold text-gray-500 px-3 py-2">Navigation</div>

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
