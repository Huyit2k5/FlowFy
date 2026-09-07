"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  type: "error" | "success" | "info" | "warning";
  message: string;
  detail?: string;
}

interface ToastContextType {
  show: (type: Toast["type"], message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: Toast["type"], message: string, detail?: string) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, type, message, detail }]);
      setTimeout(() => dismiss(id), type === "error" ? 8000 : 5000);
    },
    [dismiss]
  );

  const value: ToastContextType = {
    show,
    error: (msg, detail) => show("error", msg, detail),
    success: (msg) => show("success", msg),
    info: (msg) => show("info", msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg ${
              t.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : t.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : t.type === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <span className="text-sm">{t.type === "error" ? "❌" : t.type === "success" ? "✅" : t.type === "warning" ? "⚠️" : "ℹ️"}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{t.message}</p>
              {t.detail && <p className="mt-0.5 text-xs opacity-70">{t.detail}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-xs opacity-50 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
