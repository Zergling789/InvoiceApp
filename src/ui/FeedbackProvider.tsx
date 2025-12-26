import React, { createContext, useContext, useMemo, useState } from "react";

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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "rounded-lg px-4 py-3 text-sm shadow-lg border",
              toast.kind === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : toast.kind === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-blue-50 text-blue-800 border-blue-200",
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
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setDialog((prev) => {
        if (prev?.resolve) prev.resolve(false);
        return { title: opts.title, message: opts.message, resolve };
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">{dialog.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{dialog.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <AppButton variant="secondary" onClick={() => close(false)}>
                Abbrechen
              </AppButton>
              <AppButton onClick={() => close(true)}>Bestaetigen</AppButton>
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
