import { useEffect, useState, useCallback, useRef } from 'react';
import clsx from 'clsx';
import type { ToastType } from '@/features/toast/toastSlice';

interface ToastMessageProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bgColor: string }> = {
  success: {
    icon: '\u2713',
    color: 'var(--color-success)',
    bgColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
  },
  error: {
    icon: '\u2717',
    color: 'var(--color-error)',
    bgColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
  },
  info: {
    icon: '\u2139',
    color: 'var(--color-info)',
    bgColor: 'color-mix(in srgb, var(--color-info) 12%, transparent)',
  },
  warning: {
    icon: '\u26A0',
    color: 'var(--color-warning)',
    bgColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
  },
};

const DEFAULT_DURATION = 4000;

export default function ToastMessage({
  id,
  type,
  message,
  duration,
  onDismiss,
}: ToastMessageProps) {
  const [isExiting, setIsExiting] = useState(false);
  const effectiveDuration = duration ?? DEFAULT_DURATION;
  const config = TOAST_CONFIG[type];
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    dismissTimeoutRef.current = setTimeout(() => onDismiss(id), 200);
  }, [id, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (effectiveDuration <= 0) return;
    const timer = setTimeout(handleDismiss, effectiveDuration);
    return () => clearTimeout(timer);
  }, [effectiveDuration, handleDismiss]);

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 p-3 rounded-lg shadow-lg overflow-hidden',
        'bg-[var(--color-surface-elevated)]',
        'border border-[var(--color-border)]',
        isExiting ? 'animate-fade-out' : 'animate-slide-up',
      )}
      role="alert"
    >
      {/* Icon */}
      <span
        className={clsx(
          'flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5',
          'text-[10px] font-bold',
        )}
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
        }}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      {/* Message */}
      <p className="flex-1 text-xs text-[var(--color-text)] leading-relaxed pt-0.5">
        {message}
      </p>

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className={clsx(
          'p-0.5 rounded-md shrink-0',
          'text-[var(--color-text-muted)]',
          'hover:text-[var(--color-text)]',
          'hover:bg-[var(--color-surface)]',
          'transition-all-fast',
        )}
        title="Dismiss"
        aria-label="Dismiss notification"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>

      {/* Auto-dismiss progress bar */}
      {effectiveDuration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
          <div
            className="h-full animate-progress-shrink"
            style={{
              backgroundColor: config.color,
              animationDuration: `${effectiveDuration}ms`,
              opacity: 0.5,
            }}
          />
        </div>
      )}
    </div>
  );
}
