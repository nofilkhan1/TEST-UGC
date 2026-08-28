"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

const STYLE: Record<ToastType, { ring: string; icon: string }> = {
  success: { ring: "border-l-success", icon: "✅" },
  error: { ring: "border-l-danger", icon: "⚠️" },
  info: { ring: "border-l-violet", icon: "ℹ️" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<
    { id: number; type: ToastType; msg: string }[]
  >([]);

  const push = useCallback((type: ToastType, msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-l-4 border-ink/10 bg-white px-4 py-3 shadow-pop ${STYLE[t.type].ring}`}
          >
            <span className="text-base">{STYLE[t.type].icon}</span>
            <span className="flex-1 text-sm font-medium">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) return { success: () => {}, error: () => {}, info: () => {} } as ToastApi;
  return ctx;
}
