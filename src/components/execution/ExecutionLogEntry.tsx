import { memo, useState, useCallback } from 'react';
import clsx from 'clsx';
import type { ExecutionLog, LogLevel } from '@/types';
import { useAppSelector } from '@/app/hooks';
import { timeAgo, formatDate } from '@/utils/dateUtils';

// ─── Level styling ───────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<
  LogLevel,
  { label: string; color: string; bgColor: string }
> = {
  info: {
    label: 'INFO',
    color: 'var(--color-accent)',
    bgColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  },
  warn: {
    label: 'WARN',
    color: 'var(--color-warning)',
    bgColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
  },
  error: {
    label: 'ERR',
    color: 'var(--color-error)',
    bgColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
  },
  debug: {
    label: 'DBG',
    color: 'var(--color-text-muted)',
    bgColor: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ExecutionLogEntryProps {
  log: ExecutionLog;
}

function ExecutionLogEntryInner({ log }: ExecutionLogEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAbsolute, setShowAbsolute] = useState(false);

  const nodeName = useAppSelector((state) => {
    if (!log.nodeId) return null;
    const node = state.workflow.nodes.find((n) => n.id === log.nodeId);
    return node?.data.label ?? log.nodeId;
  });

  const levelStyle = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.debug;

  const hasData = log.data !== undefined && log.data !== null;

  const toggleExpanded = useCallback(() => {
    if (hasData) setExpanded((prev) => !prev);
  }, [hasData]);

  const toggleTimestamp = useCallback(() => {
    setShowAbsolute((prev) => !prev);
  }, []);

  return (
    <div
      className={clsx(
        'group flex flex-col gap-0.5 px-3 py-1.5',
        'font-mono text-[11px] leading-relaxed',
        'border-b border-[var(--color-border)]',
        'hover:bg-[var(--color-surface)]',
        'transition-colors duration-75',
        log.level === 'error' &&
          'bg-[color-mix(in_srgb,var(--color-error)_4%,transparent)]',
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-2 min-w-0">
        {/* Timestamp */}
        <button
          type="button"
          onClick={toggleTimestamp}
          className={clsx(
            'shrink-0 w-[72px] text-left text-[10px]',
            'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            'truncate cursor-pointer bg-transparent border-none p-0',
          )}
          title={formatDate(log.timestamp)}
        >
          {showAbsolute
            ? new Date(log.timestamp).toLocaleTimeString()
            : timeAgo(log.timestamp)}
        </button>

        {/* Level badge */}
        <span
          className="shrink-0 inline-flex items-center px-1.5 py-0 rounded-md text-[9px] font-semibold uppercase tracking-wider"
          style={{
            color: levelStyle.color,
            backgroundColor: levelStyle.bgColor,
          }}
        >
          {levelStyle.label}
        </span>

        {/* Node name */}
        {nodeName && (
          <span
            className={clsx(
              'shrink-0 max-w-[100px] truncate',
              'text-[var(--color-accent)] text-[10px] font-medium',
            )}
            title={nodeName}
          >
            [{nodeName}]
          </span>
        )}

        {/* Message */}
        <span className="flex-1 min-w-0 text-[var(--color-text)] break-words">
          {log.message}
        </span>

        {/* Expand toggle for data */}
        {hasData && (
          <button
            type="button"
            onClick={toggleExpanded}
            className={clsx(
              'shrink-0 ml-auto px-1 py-0 rounded-md text-[10px]',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              'hover:bg-[var(--color-surface-elevated)]',
              'bg-transparent border-none cursor-pointer',
              'transition-all-fast',
            )}
            title={expanded ? 'Collapse data' : 'Expand data'}
            aria-expanded={expanded}
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </button>
        )}
      </div>

      {/* Expandable data section */}
      {expanded && hasData && (
        <pre
          className={clsx(
            'ml-[82px] p-2 rounded-md text-[10px] leading-relaxed',
            'bg-[var(--color-surface-elevated)]',
            'text-[var(--color-text-muted)]',
            'overflow-x-auto max-h-48',
            'border border-[var(--color-border)]',
          )}
        >
          {JSON.stringify(log.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

const ExecutionLogEntry = memo(ExecutionLogEntryInner);
export default ExecutionLogEntry;
