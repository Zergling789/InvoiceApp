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
      "flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium",
      "min-h-[44px] min-w-[44px] rounded-md",
      isActive ? "text-indigo-600" : "text-gray-500",
    ].join(" ");

  return (
    <nav
      className="mobile-nav md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur safe-bottom"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
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
