import React, { createContext, useContext, useId, useMemo, useState } from "react";

import { AppButton } from "@/ui/AppButton";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

type ConfirmOptions = {
  title: string;
  message: string;
  acknowledgementLabel?: string;
};

type ConfirmApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<ConfirmApi | null>(null);

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (kind: ToastKind, message: string) => {
    const id = createId();
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed inset-x-4 safe-bottom-offset z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={[
              "rounded-xl border px-4 py-3 text-sm shadow-lg",
              toast.kind === "success"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : toast.kind === "error"
                ? "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-200"
                : "border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-200",
            ].join(" ")}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const titleId = useId();
  const [acknowledged, setAcknowledged] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    acknowledgementLabel?: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setAcknowledged(false);
      setDialog((prev) => {
        if (prev?.resolve) prev.resolve(false);
        return { ...opts, resolve };
      });
    });

  const api = useMemo<ConfirmApi>(() => ({ confirm }), []);

  const close = (value: boolean) => {
    if (dialog?.resolve) dialog.resolve(value);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {dialog && (
        <div className="app-visual-viewport fixed inset-x-0 z-[90] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
          <div
            className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface-solid)] p-5 text-[var(--app-text)] shadow-2xl safe-bottom sm:max-h-[90%] sm:rounded-[var(--app-radius-lg)] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <h3 id={titleId} className="text-lg font-semibold">{dialog.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--app-muted)]">{dialog.message}</p>
            {dialog.acknowledgementLabel && (
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--app-border)] p-3 text-sm">
                <input
                  className="mt-0.5 h-4 w-4"
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>{dialog.acknowledgementLabel}</span>
              </label>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AppButton className="w-full sm:w-auto" variant="secondary" onClick={() => close(false)}>
                Abbrechen
              </AppButton>
              <AppButton
                className="w-full sm:w-auto"
                disabled={Boolean(dialog.acknowledgementLabel) && !acknowledged}
                onClick={() => close(true)}
              >
                Bestätigen
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return ctx;
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider.");
  }
  return ctx;
}
