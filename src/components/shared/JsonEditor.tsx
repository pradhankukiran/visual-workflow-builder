import { useState, useCallback, useRef, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  maxHeight?: string;
}

function countLines(text: string): number {
  return text.split('\n').length;
}

function validateJson(text: string): string | null {
  if (!text.trim()) return null;
  try {
    JSON.parse(text);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid JSON';
  }
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );
}

export default function JsonEditor({
  value,
  onChange,
  placeholder = '{\n  \n}',
  readOnly = false,
  maxHeight = '300px',
}: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const error = useMemo(() => validateJson(value), [value]);
  const lineCount = useMemo(() => countLines(value || placeholder), [value, placeholder]);
  const highlighted = useMemo(
    () => (value ? syntaxHighlight(value) : ''),
    [value],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Auto-format valid JSON on blur
    if (value.trim()) {
      try {
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        if (formatted !== value) {
          onChange(formatted);
        }
      } catch {
        // Leave invalid JSON as-is
      }
    }
  }, [value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd } = textarea;
        const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
        });
      }
    },
    [value, onChange],
  );

  return (
    <div className="space-y-1">
      <div
        className={clsx(
          'relative rounded-lg overflow-hidden border',
          'font-mono text-xs leading-5',
          error && value.trim()
            ? 'border-[var(--color-error)]'
            : isFocused
              ? 'border-[var(--color-accent)]'
              : 'border-[var(--color-border)]',
          'transition-all-fast',
        )}
        style={{ maxHeight }}
      >
        <div className="flex overflow-auto" style={{ maxHeight }}>
          {/* Line numbers */}
          <div
            className={clsx(
              'flex flex-col items-end shrink-0 py-2.5 px-2',
              'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
              'select-none border-r border-[var(--color-border)]',
              'text-[10px] leading-5',
            )}
            aria-hidden="true"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>

          {/* Editor area */}
          <div className="relative flex-1 min-w-0">
            {/* Syntax highlight overlay */}
            <pre
              className={clsx(
                'absolute inset-0 p-2.5 m-0 whitespace-pre-wrap break-words',
                'pointer-events-none',
                'bg-[var(--color-surface-elevated)]',
              )}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlighted || `<span class="json-placeholder">${placeholder}</span>` }}
            />

            {/* Actual textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              placeholder={placeholder}
              spellCheck={false}
              className={clsx(
                'relative w-full h-full p-2.5 m-0',
                'bg-transparent text-transparent caret-[var(--color-text)]',
                'resize-none outline-none',
                'whitespace-pre-wrap break-words',
                readOnly && 'cursor-default',
              )}
              style={{ minHeight: '80px' }}
              aria-label="JSON editor"
              aria-invalid={!!error}
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && value.trim() && (
        <p className="text-[10px] text-[var(--color-error)] px-1">{error}</p>
      )}

      {/* Inline styles for syntax colors */}
      <style>{`
        .json-key { color: var(--color-accent); }
        .json-string { color: var(--color-success); }
        .json-number { color: var(--color-warning); }
        .json-boolean { color: var(--color-info); }
        .json-null { color: var(--color-text-muted); font-style: italic; }
        .json-placeholder { color: var(--color-text-muted); opacity: 0.5; }
      `}</style>
    </div>
  );
}
