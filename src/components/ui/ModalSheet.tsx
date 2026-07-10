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
  contentMode?: "scroll" | "contained";
  width?: "default" | "wide";
};

export function ModalSheet({
  title,
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  showBackdrop = true,
  contentMode = "scroll",
  width = "default",
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
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {showBackdrop && (
        <button
          type="button"
          aria-label="Overlay schließen"
          className="absolute inset-0 bg-black/40"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
      )}
      <div className={`relative z-10 flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[92dvh] sm:rounded-xl ${width === "wide" ? "sm:max-w-6xl" : "sm:max-w-4xl"}`}>
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-4 sm:px-6">
          <AppButton variant="ghost" onClick={onClose} aria-label="Zurück">
            <ArrowLeft size={18} />
          </AppButton>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div
          className={
            contentMode === "contained"
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalSheet;
