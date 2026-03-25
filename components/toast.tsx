"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((toast: ToastInput) => {
    const id = createId();
    const nextToast: Toast = {
      id,
      title: toast.title,
      message: toast.message,
      variant: toast.variant ?? "info",
    };

    setToasts((prev) => [...prev, nextToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed right-6 top-6 z-50 flex max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const variantStyle =
            toast.variant === "success"
              ? "border-accent/40 bg-accent/10 text-accent-strong"
              : toast.variant === "error"
                ? "border-accent-warm/40 bg-accent-warm/10 text-accent-warm"
                : "border-border/60 bg-surface text-foreground";

          return (
            <div
              key={toast.id}
              className={`fade-up rounded-2xl border px-4 py-3 shadow-[var(--shadow)] ${variantStyle}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {toast.title ? (
                    <p className="text-sm font-semibold">{toast.title}</p>
                  ) : null}
                  <p className="text-xs text-muted">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(toast.id)}
                  className="text-xs text-muted transition hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}