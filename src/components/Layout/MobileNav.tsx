import { NavLink } from "react-router-dom";
import type { NavItem } from "./Sidebar";

type MobileNavProps = {
  items: NavItem[];
  hidden?: boolean;
};

export function MobileNav({ items, hidden = false }: MobileNavProps) {
  if (hidden) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex min-h-[52px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors",
      isActive ? "bg-black/[0.05] text-[var(--app-primary)] dark:bg-white/10" : "text-[var(--app-muted)]",
    ].join(" ");

  return (
    <nav
      className="mobile-nav safe-bottom fixed inset-x-3 bottom-3 z-40 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow)] backdrop-blur-xl md:hidden"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 gap-1 p-2">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default MobileNav;
