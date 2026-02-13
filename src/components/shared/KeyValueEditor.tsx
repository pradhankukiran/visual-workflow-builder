import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';

interface KeyValueEntry {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const handleEntryChange = useCallback(
    (index: number, field: 'key' | 'value', newValue: string) => {
      const updated = entries.map((entry, i) =>
        i === index ? { ...entry, [field]: newValue } : entry,
      );
      onChange(updated);
    },
    [entries, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange([...entries, { key: '', value: '' }]);
  }, [entries, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(entries.filter((_, i) => i !== index));
    },
    [entries, onChange],
  );

  return (
    <div className="space-y-2">
      {/* Header labels */}
      {entries.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {keyPlaceholder}
          </span>
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {valuePlaceholder}
          </span>
          <span className="w-7 shrink-0" /> {/* Spacer for remove button */}
        </div>
      )}

      {/* Rows */}
      {entries.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 group">
          <input
            type="text"
            value={entry.key}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleEntryChange(index, 'key', e.target.value)
            }
            placeholder={keyPlaceholder}
            className={clsx(
              'flex-1 px-2.5 py-1.5 rounded-md text-xs',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent)]',
              'transition-all-fast',
            )}
            aria-label={`${keyPlaceholder} ${index + 1}`}
          />
          <input
            type="text"
            value={entry.value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleEntryChange(index, 'value', e.target.value)
            }
            placeholder={valuePlaceholder}
            className={clsx(
              'flex-1 px-2.5 py-1.5 rounded-md text-xs',
              'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
              'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
              'outline-none focus:border-[var(--color-accent)]',
              'transition-all-fast',
            )}
            aria-label={`${valuePlaceholder} ${index + 1}`}
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className={clsx(
              'flex items-center justify-center w-7 h-7 rounded-md shrink-0',
              'text-[var(--color-text-muted)]',
              'opacity-0 group-hover:opacity-100',
              'hover:text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
              'transition-all-fast',
            )}
            title="Remove row"
            aria-label={`Remove row ${index + 1}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </button>
        </div>
      ))}

      {/* Add row */}
      <button
        type="button"
        onClick={handleAdd}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs',
          'text-[var(--color-accent)] font-medium',
          'border border-dashed border-[var(--color-border)]',
          'hover:border-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_5%,transparent)]',
          'transition-all-fast w-full justify-center',
        )}
        aria-label="Add new key-value pair"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 2v8M2 6h8" />
        </svg>
        Add Row
      </button>

      {/* Empty state */}
      {entries.length === 0 && (
        <div
          className={clsx(
            'text-center py-4 text-xs text-[var(--color-text-muted)]',
            'border border-dashed border-[var(--color-border)] rounded-md',
          )}
        >
          No entries. Click "Add Row" to begin.
        </div>
      )}
    </div>
  );
}
