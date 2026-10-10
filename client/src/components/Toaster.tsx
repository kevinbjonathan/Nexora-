import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/format';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={16} aria-hidden="true" />,
  error: <AlertCircle size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
  warning: <AlertCircle size={16} aria-hidden="true" />,
};

const STYLES: Record<ToastKind, { bar: string; icon: string }> = {
  success: { bar: 'bg-lime', icon: 'text-forest' },
  error: { bar: 'bg-danger', icon: 'text-danger' },
  info: { bar: 'bg-forest', icon: 'text-forest' },
  warning: { bar: 'bg-warning', icon: 'text-warning' },
};

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-3), { id, kind, title, message }]);
      setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (t, m) => push('success', t, m),
      error: (t, m) => push('error', t, m),
      info: (t, m) => push('info', t, m),
      warning: (t, m) => push('warning', t, m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-white p-3.5 shadow-lg menu-pop"
          >
            <span className={cx('mt-0.5 shrink-0', STYLES[t.kind].icon)}>{ICONS[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{t.message}</p>}
            </div>
            <span className={cx('absolute left-0 top-0 h-full w-1', STYLES[t.kind].bar)} aria-hidden="true" />
            <button
              onClick={() => dismiss(t.id)}
              className="ml-1 shrink-0 rounded-md p-1 text-ink-300 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToasterProvider>');
  return ctx;
}