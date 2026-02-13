import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectCurrentRunLogs } from '@/features/execution/executionSelectors';
import { clearExecutionHistory } from '@/features/execution/executionSlice';
import type { LogLevel } from '@/types';
import ExecutionLogEntry from './ExecutionLogEntry';
import EmptyState from '@/components/shared/EmptyState';

// ─── Level filter definitions ────────────────────────────────────────────────

const LOG_LEVELS: { level: LogLevel; label: string; color: string }[] = [
  { level: 'info', label: 'Info', color: 'var(--color-accent)' },
  { level: 'warn', label: 'Warn', color: 'var(--color-warning)' },
  { level: 'error', label: 'Error', color: 'var(--color-error)' },
  { level: 'debug', label: 'Debug', color: 'var(--color-text-muted)' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExecutionLog() {
  const dispatch = useAppDispatch();
  const logs = useAppSelector(selectCurrentRunLogs);

  const [collapsed, setCollapsed] = useState(false);
  const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(
    new Set(['info', 'warn', 'error', 'debug']),
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // Filter logs by selected levels.
  const filteredLogs = useMemo(
    () => logs.filter((log) => enabledLevels.has(log.level)),
    [logs, enabledLevels],
  );

  // Auto-scroll to bottom on new entries.
  useEffect(() => {
    if (isAutoScrollRef.current && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [filteredLogs.length]);

  // Track whether user has scrolled up (disable auto-scroll).
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isAutoScrollRef.current = isAtBottom;
  }, []);

  const toggleLevel = useCallback((level: LogLevel) => {
    setEnabledLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        // Don't allow disabling all levels
        if (next.size > 1) {
          next.delete(level);
        }
      } else {
        next.add(level);
      }
      return next;
    });
  }, []);

  const handleClear = useCallback(() => {
    dispatch(clearExecutionHistory());
  }, [dispatch]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      className={clsx(
        'flex flex-col',
        'bg-[var(--color-bg)] border-t border-[var(--color-border)]',
        'transition-all duration-200',
        collapsed ? 'h-9' : 'h-56',
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 shrink-0',
          'border-b border-[var(--color-border)]',
          'bg-[var(--color-surface)]',
        )}
      >
        {/* Collapse / expand toggle */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={clsx(
            'flex items-center justify-center w-5 h-5 rounded-md',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            'hover:bg-[var(--color-surface-elevated)]',
            'bg-transparent border-none cursor-pointer',
            'transition-all-fast',
          )}
          title={collapsed ? 'Expand log panel' : 'Collapse log panel'}
          aria-expanded={!collapsed}
        >
          <svg
            className={clsx(
              'w-3 h-3 transition-transform duration-150',
              collapsed && '-rotate-90',
            )}
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>

        <span className="text-xs font-semibold text-[var(--color-text)] select-none">
          Execution Log
        </span>

        {/* Entry count */}
        <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
          ({filteredLogs.length}
          {filteredLogs.length !== logs.length && ` / ${logs.length}`})
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Level filter toggles */}
        {!collapsed && (
          <div className="flex items-center gap-1">
            {LOG_LEVELS.map(({ level, label, color }) => {
              const active = enabledLevels.has(level);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className={clsx(
                    'px-1.5 py-0.5 rounded-md text-[10px] font-medium',
                    'border cursor-pointer',
                    'transition-all-fast',
                    active
                      ? 'border-current opacity-100'
                      : 'border-transparent opacity-40 hover:opacity-70',
                  )}
                  style={{ color }}
                  title={`${active ? 'Hide' : 'Show'} ${label} entries`}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Clear button */}
        {!collapsed && logs.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className={clsx(
              'px-2 py-0.5 rounded-md text-[10px] font-medium',
              'text-[var(--color-text-muted)] hover:text-[var(--color-error)]',
              'hover:bg-[var(--color-surface-elevated)]',
              'bg-transparent border-none cursor-pointer',
              'transition-all-fast',
            )}
            title="Clear all logs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Log body */}
      {!collapsed && (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon="\uD83D\uDCDC"
              title="No log entries"
              description="Run your workflow to see execution logs here."
            />
          ) : (
            filteredLogs.map((log) => (
              <ExecutionLogEntry key={log.id} log={log} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
