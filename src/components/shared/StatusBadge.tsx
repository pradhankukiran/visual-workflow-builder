import clsx from 'clsx';

type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

type BadgeStatus = ExecutionStatus | NodeExecutionStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  idle: {
    label: 'Idle',
    color: 'var(--color-text-muted)',
    bgColor: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
    icon: '\u25CB',
  },
  pending: {
    label: 'Pending',
    color: 'var(--color-text-muted)',
    bgColor: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
    icon: '\u25CB',
  },
  running: {
    label: 'Running',
    color: 'var(--color-accent)',
    bgColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
    icon: '\u25CF',
  },
  paused: {
    label: 'Paused',
    color: 'var(--color-warning)',
    bgColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)',
    icon: '\u275A\u275A',
  },
  completed: {
    label: 'Completed',
    color: 'var(--color-success)',
    bgColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    icon: '\u2713',
  },
  success: {
    label: 'Success',
    color: 'var(--color-success)',
    bgColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
    icon: '\u2713',
  },
  failed: {
    label: 'Failed',
    color: 'var(--color-error)',
    bgColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
    icon: '\u2717',
  },
  error: {
    label: 'Error',
    color: 'var(--color-error)',
    bgColor: 'color-mix(in srgb, var(--color-error) 12%, transparent)',
    icon: '\u2717',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'var(--color-text-muted)',
    bgColor: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
    icon: '\u2298',
  },
  skipped: {
    label: 'Skipped',
    color: 'var(--color-text-muted)',
    bgColor: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
    icon: '\u2192',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const isRunning = status === 'running';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium select-none',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
        size === 'md' && 'px-2 py-0.5 text-xs',
      )}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={clsx(
          'inline-block text-[8px] leading-none',
          isRunning && 'animate-pulse',
        )}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
