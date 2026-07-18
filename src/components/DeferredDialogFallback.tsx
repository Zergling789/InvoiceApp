type DeferredDialogFallbackProps = {
  label: string;
};

export function DeferredDialogFallback({ label }: DeferredDialogFallbackProps) {
  return (
    <div className="app-visual-viewport fixed inset-x-0 z-[80] grid place-items-center bg-black/35 p-6 backdrop-blur-sm">
      <div
        role="status"
        className="app-card rounded-2xl px-5 py-4 text-sm font-medium text-[var(--app-text)] shadow-[var(--app-shadow)]"
      >
        {label}
      </div>
    </div>
  );
}
