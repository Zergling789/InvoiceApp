import React from "react";

export function AppCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-card transition-[border-color,box-shadow,transform] duration-200 ${className}`}>
      {children}
    </div>
  );
}
