import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cx } from '@/lib/format';
import { useLockBodyScroll, useOnKeyDown } from '@/hooks/useHooks';

/** Accessible modal dialog. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  dismissable?: boolean;
}) {
  useLockBodyScroll(open);
  useOnKeyDown((e) => {
    if (open && e.key === 'Escape') onClose();
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const panel = document.getElementById('dialog-panel');
    panel?.focus();
    return () => prev?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/45 fade-overlay" onClick={() => dismissable && onClose()} aria-hidden="true" />
      <div
        id="dialog-panel"
        tabIndex={-1}
        className={cx(
          'dialog-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-ivory shadow-2xl outline-none sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-medium text-ink">{title}</h2>
          {dismissable && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="panel-scroll flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-border bg-white px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}