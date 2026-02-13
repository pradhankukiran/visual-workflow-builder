import { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus confirm button on open
  useEffect(() => {
    if (open) {
      confirmBtnRef.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[100] flex items-center justify-center',
        'bg-black/40 backdrop-blur-[2px]',
        'animate-fade-in',
      )}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        ref={dialogRef}
        className={clsx(
          'w-full max-w-sm mx-4 p-5 rounded-xl',
          'bg-[var(--color-surface-elevated)]',
          'border border-[var(--color-border)]',
          'shadow-xl',
          'animate-scale-in',
        )}
      >
        {/* Title */}
        <h2
          id="confirm-dialog-title"
          className="text-sm font-semibold text-[var(--color-text)] mb-2"
        >
          {title}
        </h2>

        {/* Message */}
        <p
          id="confirm-dialog-message"
          className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-medium',
              'border border-[var(--color-border)]',
              'text-[var(--color-text)] bg-[var(--color-surface)]',
              'hover:bg-[var(--color-surface-elevated)]',
              'transition-all-fast active:scale-[0.98]',
            )}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-medium text-white',
              'transition-all-fast active:scale-[0.98]',
              variant === 'destructive'
                ? 'bg-[var(--color-error)] hover:brightness-90'
                : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
