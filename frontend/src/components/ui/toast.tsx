'use client';

/**
 * Minimal toast/undo system. No external dependency (sonner isn't installed) —
 * a tiny React context + a fixed-position stack rendered through a portal.
 * `useToast()` returns `showToast({ message, actionLabel?, onAction? })`; the
 * action button (e.g. "Undo") dismisses the toast and runs the callback. Toasts
 * auto-dismiss after 4s (8s when they have an action).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastInput {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItem extends ToastInput {
  id: number;
  leaving: boolean;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  // Portals only render after hydration — the SSR tree (and the first client
  // render) must stay identical, otherwise React reports a hydration mismatch
  // for this container div.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = ++nextId.current;
      const autoMs = input.actionLabel ? 8000 : 4000;
      setToasts((cur) => [...cur, { ...input, id, leaving: false }]);
      window.setTimeout(() => dismiss(id), autoMs);
    },
    [dismiss],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToasts([]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
          >
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-popover px-4 py-3 text-sm shadow-lg transition-all',
                  toast.leaving
                    ? 'translate-y-2 opacity-0'
                    : 'translate-y-0 opacity-100',
                )}
              >
                <Check className="h-4 w-4 shrink-0 text-success" />
                <p className="min-w-0 flex-1 font-medium">{toast.message}</p>
                {toast.actionLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismiss(toast.id);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    {toast.actionLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
