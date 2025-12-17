import React from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center text-gray-600 border border-dashed border-gray-200 rounded-lg p-8 bg-gray-50">
      <div className="text-lg font-semibold text-gray-800">{title}</div>
      {description && <div className="mt-2 text-sm text-gray-500">{description}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
