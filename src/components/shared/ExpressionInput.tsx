import { useState, useCallback, useRef, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

interface Segment {
  text: string;
  isExpression: boolean;
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\{\{([^}]*)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isExpression: false });
    }
    segments.push({ text: match[0], isExpression: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isExpression: false });
  }

  return segments;
}

export default function ExpressionInput({
  value,
  onChange,
  placeholder = 'Enter value or use {{expression}}',
  label,
}: ExpressionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const segments = useMemo(() => parseSegments(value), [value]);
  const hasExpressions = useMemo(() => segments.some((s) => s.isExpression), [segments]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="space-y-1">
      {/* Label */}
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {label}
          </label>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className={clsx(
                'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full',
                'text-[8px] font-bold',
                'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
                'border border-[var(--color-border)]',
                'hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
                'transition-all-fast cursor-help',
              )}
              aria-label="Expression syntax help"
            >
              ?
            </button>

            {/* Tooltip */}
            {showTooltip && (
              <div
                className={clsx(
                  'absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50',
                  'w-56 p-2.5 rounded-lg shadow-lg',
                  'bg-[var(--color-surface-elevated)]',
                  'border border-[var(--color-border)]',
                  'text-[10px] text-[var(--color-text)]',
                  'animate-scale-in',
                )}
                role="tooltip"
              >
                <p className="font-semibold mb-1">Expression Syntax</p>
                <p className="text-[var(--color-text-muted)] mb-2">
                  Use <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)]">{'{{'} ... {'}}'}</code> to
                  reference data from previous nodes.
                </p>
                <div className="space-y-1 text-[var(--color-text-muted)]">
                  <p><code className="font-mono text-[var(--color-accent)]">{'{{$node.id.data.field}}'}</code></p>
                  <p><code className="font-mono text-[var(--color-accent)]">{'{{$vars.myVar}}'}</code></p>
                  <p><code className="font-mono text-[var(--color-accent)]">{'{{$input.body.name}}'}</code></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input container */}
      <div
        className={clsx(
          'relative rounded-md overflow-hidden border',
          isFocused
            ? 'border-[var(--color-accent)]'
            : 'border-[var(--color-border)]',
          'transition-all-fast',
        )}
      >
        {/* Highlighted preview overlay (shown when not focused and has expressions) */}
        {!isFocused && hasExpressions && value && (
          <div
            className={clsx(
              'absolute inset-0 flex items-center px-3',
              'pointer-events-none text-xs',
              'bg-[var(--color-surface-elevated)]',
            )}
            aria-hidden="true"
          >
            {segments.map((seg, i) =>
              seg.isExpression ? (
                <span
                  key={i}
                  className={clsx(
                    'inline-flex items-center px-1 py-0.5 mx-0.5 rounded-md',
                    'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]',
                    'text-[var(--color-accent)] font-mono text-[11px]',
                  )}
                >
                  {seg.text}
                </span>
              ) : (
                <span key={i} className="text-[var(--color-text)]">
                  {seg.text}
                </span>
              ),
            )}
          </div>
        )}

        {/* Actual input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={clsx(
            'w-full px-3 py-2 text-xs',
            'bg-[var(--color-surface-elevated)]',
            'text-[var(--color-text)]',
            'placeholder:text-[var(--color-text-muted)]',
            'outline-none',
            // When not focused and has expressions, make text transparent so overlay shows
            !isFocused && hasExpressions && value && 'text-transparent',
          )}
          aria-label={label || 'Expression input'}
        />

        {/* Expression indicator */}
        {hasExpressions && (
          <div
            className={clsx(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'text-[9px] font-mono font-bold',
              'text-[var(--color-accent)] opacity-60',
              'select-none pointer-events-none',
            )}
          >
            {'{ }'}
          </div>
        )}
      </div>
    </div>
  );
}
