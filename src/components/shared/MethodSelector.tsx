import { useCallback } from 'react';
import clsx from 'clsx';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET: {
    bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    text: 'var(--color-success)',
    border: 'var(--color-success)',
  },
  POST: {
    bg: 'color-mix(in srgb, var(--color-info) 12%, transparent)',
    text: 'var(--color-info)',
    border: 'var(--color-info)',
  },
  PUT: {
    bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    text: 'var(--color-warning)',
    border: 'var(--color-warning)',
  },
  PATCH: {
    bg: 'color-mix(in srgb, var(--color-node-trigger) 12%, transparent)',
    text: 'var(--color-node-trigger)',
    border: 'var(--color-node-trigger)',
  },
  DELETE: {
    bg: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
    text: 'var(--color-error)',
    border: 'var(--color-error)',
  },
};

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function MethodSelector({ value, onChange }: MethodSelectorProps) {
  const handleClick = useCallback(
    (method: HttpMethod) => {
      onChange(method);
    },
    [onChange],
  );

  return (
    <div
      className={clsx(
        'flex rounded-lg overflow-hidden',
        'border border-[var(--color-border)]',
        'bg-[var(--color-surface)]',
      )}
      role="radiogroup"
      aria-label="HTTP method"
    >
      {METHODS.map((method) => {
        const isSelected = value === method;
        const colors = METHOD_COLORS[method];

        return (
          <button
            key={method}
            type="button"
            onClick={() => handleClick(method)}
            className={clsx(
              'flex-1 px-2 py-1.5 text-[11px] font-bold tracking-wide',
              'transition-all-fast relative',
              'focus-visible:z-10',
              isSelected
                ? 'z-10'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]',
            )}
            style={
              isSelected
                ? {
                    backgroundColor: colors.bg,
                    color: colors.text,
                    boxShadow: `inset 0 -2px 0 ${colors.border}`,
                  }
                : undefined
            }
            role="radio"
            aria-checked={isSelected}
            aria-label={`${method} method`}
          >
            {method}
          </button>
        );
      })}
    </div>
  );
}
