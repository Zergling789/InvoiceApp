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
      "group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-[var(--app-surface-solid)] text-[var(--app-text)] shadow-sm ring-1 ring-black/[0.04] dark:ring-white/10"
        : "text-[var(--app-muted)] hover:bg-black/[0.04] hover:text-[var(--app-text)] dark:hover:bg-white/[0.06]",
    ].join(" ");

  return (
    <aside className="sticky top-24 h-fit">
      <div className="app-eyebrow px-3 pb-3 pt-1">
        Arbeitsbereich
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
