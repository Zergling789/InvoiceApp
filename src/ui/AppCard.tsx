import React from "react";

export function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-card ${className}`}>
      {children}
    </div>
  );
}
