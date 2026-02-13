import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useAppSelector } from '@/app/hooks';
import { selectNodeExecutionStatus } from '@/features/execution/executionSelectors';
import { selectAllNodes } from '@/features/workflow/workflowSelectors';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDuration } from '@/utils/dateUtils';
import type { RootState } from '@/app/store';

// ─── Props ───────────────────────────────────────────────────────────────────

interface NodeOutputViewerProps {
  nodeId: string;
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-2 text-left',
          'text-xs font-medium text-[var(--color-text)]',
          'bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)]',
          'border-none cursor-pointer',
          'transition-colors duration-75',
        )}
        aria-expanded={open}
      >
        <svg
          className={clsx(
            'w-3 h-3 transition-transform duration-150 shrink-0',
            open && 'rotate-90',
          )}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        {title}
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)]">{children}</div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NodeOutputViewer({ nodeId }: NodeOutputViewerProps) {
  const nodeResult = useAppSelector((state: RootState) =>
    selectNodeExecutionStatus(state, nodeId),
  );
  const nodes = useAppSelector(selectAllNodes);
  const node = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId],
  );

  const [copyFeedback, setCopyFeedback] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const outputStr = useMemo(() => {
    if (!nodeResult?.output) return null;
    try {
      return JSON.stringify(nodeResult.output, null, 2);
    } catch {
      return String(nodeResult.output);
    }
  }, [nodeResult?.output]);

  const handleCopyOutput = useCallback(() => {
    if (outputStr) {
      navigator.clipboard.writeText(outputStr).then(() => {
        setCopyFeedback(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopyFeedback(false), 1500);
      });
    }
  }, [outputStr]);

  if (!nodeResult) {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center py-8 px-4',
          'text-center',
        )}
      >
        <p className="text-xs text-[var(--color-text-muted)]">
          No execution data available for this node.
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          Run the workflow to see output here.
        </p>
      </div>
    );
  }

  // Map NodeExecutionStatus to StatusBadge's expected values
  const badgeStatus =
    nodeResult.status === 'completed'
      ? 'completed'
      : nodeResult.status === 'failed'
        ? 'failed'
        : nodeResult.status === 'running'
          ? 'running'
          : nodeResult.status === 'skipped'
            ? 'skipped'
            : 'pending';

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Header: Node name + status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text)] truncate">
          {node?.data.label ?? nodeId}
        </span>
        <StatusBadge status={badgeStatus} size="sm" />
      </div>

      {/* Duration */}
      {nodeResult.duration !== undefined && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="font-medium">Duration:</span>
          <span className="font-mono tabular-nums">
            {formatDuration(nodeResult.duration)}
          </span>
        </div>
      )}

      {/* Error message */}
      {nodeResult.error && (
        <CollapsibleSection title="Error" defaultOpen>
          <div
            className={clsx(
              'p-3 text-xs font-mono break-words',
              'text-[var(--color-error)]',
              'bg-[color-mix(in_srgb,var(--color-error)_4%,transparent)]',
            )}
          >
            {nodeResult.error}
          </div>
        </CollapsibleSection>
      )}

      {/* Output data */}
      {outputStr && (
        <CollapsibleSection title="Output" defaultOpen>
          <div className="relative">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopyOutput}
              className={clsx(
                'absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px]',
                'bg-[var(--color-surface)] border border-[var(--color-border)]',
                'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                'hover:bg-[var(--color-surface-elevated)]',
                'cursor-pointer transition-all-fast',
              )}
              title="Copy output"
            >
              {copyFeedback ? 'Copied!' : 'Copy'}
            </button>

            <pre
              className={clsx(
                'p-3 text-[11px] font-mono leading-relaxed',
                'text-[var(--color-text)]',
                'bg-[var(--color-surface-elevated)]',
                'overflow-x-auto max-h-64',
                'whitespace-pre-wrap break-words',
              )}
            >
              {outputStr}
            </pre>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
