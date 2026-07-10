import React from "react";

type BadgeColor = "gray" | "green" | "blue" | "yellow" | "red";

export function AppBadge({
  children,
  color = "gray",
}: {
  children: React.ReactNode;
  color?: BadgeColor;
}) {
  const colors: Record<BadgeColor, string> = {
    gray: "bg-black/[0.05] text-gray-600 dark:bg-white/10 dark:text-gray-300",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    yellow: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    red: "bg-red-500/10 text-red-700 dark:text-red-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}
