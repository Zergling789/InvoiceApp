import { Link } from "react-router-dom";
import { FolderKanban, Settings } from "lucide-react";

import { AppCard } from "@/ui/AppCard";

const links = [
  {
    to: "/app/projects",
    label: "Projekte",
    description: "Projektstatus, Budgets und Aufgaben verwalten.",
    icon: <FolderKanban size={18} />,
  },
  {
    to: "/app/settings",
    label: "Einstellungen",
    description: "Branding, Nummernkreise und Absenderdaten.",
    icon: <Settings size={18} />,
  },
];

export default function MorePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Mehr</h1>
        <p className="text-sm text-gray-600">Weitere Bereiche der Anwendung.</p>
      </div>

      <div className="space-y-3">
        {links.map((item) => (
          <Link key={item.to} to={item.to} className="block">
            <AppCard className="flex items-center justify-between gap-4 px-4 py-4 min-h-[72px] hover:border-indigo-200 hover:bg-indigo-50/40 transition">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-indigo-600">{item.icon}</span>
                <div>
                  <div className="font-semibold text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
              </div>
              <span className="text-sm text-indigo-600">Öffnen</span>
            </AppCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
