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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <button
        aria-label="Schließen"
        className="absolute inset-0 h-full w-full"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl safe-bottom">
        {title && (
          <div className="border-b px-5 py-4">
            <div className="text-sm font-semibold text-gray-700">{title}</div>
          </div>
        )}
        <div className="flex flex-col gap-2 px-5 py-4">
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
