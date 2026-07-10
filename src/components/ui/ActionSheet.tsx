import { useEffect } from "react";

import { AppButton } from "@/ui/AppButton";

type ActionSheetAction = {
  label: string;
  onSelect: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
};

type ActionSheetProps = {
  isOpen: boolean;
  title?: string;
  actions: ActionSheetAction[];
  onClose: () => void;
};

export function ActionSheet({ isOpen, title, actions, onClose }: ActionSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:p-4">
      <button
        aria-label="Schließen"
        className="absolute inset-0 h-full w-full"
        onClick={onClose}
      />
      <div className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl safe-bottom">
        {title && (
          <div className="border-b px-5 py-4">
            <div className="text-sm font-semibold text-gray-700">{title}</div>
          </div>
        )}
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-5 py-4">
          {actions.map((action) => (
            <AppButton
              key={action.label}
              variant={action.variant ?? "secondary"}
              className="w-full justify-center"
              onClick={action.onSelect}
              disabled={action.disabled}
            >
              {action.label}
            </AppButton>
          ))}
          <AppButton variant="ghost" className="w-full justify-center" onClick={onClose}>
            Abbrechen
          </AppButton>
        </div>
      </div>
    </div>
  );
}
