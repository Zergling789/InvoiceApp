import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { AppButton } from "@/ui/AppButton";

type ModalSheetProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  showBackdrop?: boolean;
};

export function ModalSheet({
  title,
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  showBackdrop = true,
}: ModalSheetProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {showBackdrop && (
        <button
          type="button"
          aria-label="Overlay schließen"
          className="absolute inset-0 bg-black/40"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
      )}
      <div className="relative z-10 w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-xl shadow-xl h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b">
          <AppButton variant="ghost" onClick={onClose} aria-label="Zurück">
            <ArrowLeft size={18} />
          </AppButton>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default ModalSheet;
