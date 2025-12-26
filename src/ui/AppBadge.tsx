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
    gray: "bg-gray-100 text-gray-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
