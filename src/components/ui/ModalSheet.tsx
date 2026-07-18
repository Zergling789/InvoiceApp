import { useEffect, useId, type ReactNode } from "react";
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
  const titleId = useId();
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
    <div className="app-visual-viewport fixed inset-x-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      {showBackdrop && (
        <button
          type="button"
          aria-label="Overlay schließen"
          className="absolute inset-0 bg-black/40"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
      )}
      <div
        className={`relative z-10 flex h-full w-full min-h-0 flex-col overflow-hidden rounded-t-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] shadow-2xl sm:h-[92%] sm:rounded-[var(--app-radius-lg)] ${width === "wide" ? "sm:max-w-6xl" : "sm:max-w-4xl"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-4 safe-top sm:px-6">
          <AppButton variant="ghost" onClick={onClose} aria-label="Zurück">
            <ArrowLeft size={18} />
          </AppButton>
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
        </div>
        <div
          className={
            contentMode === "contained"
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-32"
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalSheet;
