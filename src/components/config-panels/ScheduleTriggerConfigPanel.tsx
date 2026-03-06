import { useCallback, useMemo, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import { useAppSelector } from '@/app/hooks';
import { useGetScheduleStatusQuery } from '@/features/workflowLibrary/workflowLibraryApi';
import type { ScheduleTriggerConfig } from '@/types';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const CRON_EXAMPLES: { expression: string; label: string }[] = [
  { expression: '* * * * *', label: 'Every minute' },
  { expression: '*/5 * * * *', label: 'Every 5 minutes' },
  { expression: '0 * * * *', label: 'Every hour' },
  { expression: '0 0 * * *', label: 'Every day at midnight' },
  { expression: '0 9 * * 1-5', label: 'Weekdays at 9 AM' },
  { expression: '0 0 * * 0', label: 'Every Sunday at midnight' },
  { expression: '0 0 1 * *', label: 'First day of every month' },
];

/**
 * Parse a basic cron expression into a human-readable string.
 */
function parseCronExpression(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron expression (expected 5 fields)';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Check for common patterns
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Runs every minute';
  }
  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Runs every ${minute.slice(2)} minutes`;
  }
  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Runs every hour at minute 0';
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Runs every day at midnight';
  }
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const h = /^\d+$/.test(hour) ? hour.padStart(2, '0') : hour;
    const m = /^\d+$/.test(minute) ? minute.padStart(2, '0') : minute;
    return `Runs daily at ${h}:${m}`;
  }
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    const h = /^\d+$/.test(hour) ? hour.padStart(2, '0') : hour;
    const m = /^\d+$/.test(minute) ? minute.padStart(2, '0') : minute;
    return `Runs weekdays at ${h}:${m}`;
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '1' && month === '*' && dayOfWeek === '*') {
    return 'Runs on the first day of every month at midnight';
  }
  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '0') {
    return 'Runs every Sunday at midnight';
  }

  return `Runs at minute ${minute}, hour ${hour}, day-of-month ${dayOfMonth}, month ${month}, day-of-week ${dayOfWeek}`;
}

export default function ScheduleTriggerConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();
  const workflowId = useAppSelector((state) => state.workflow.id);
  const { data: scheduleStatus, isLoading: isScheduleLoading } = useGetScheduleStatusQuery(workflowId, { skip: !workflowId });

  const config = selectedNode?.data.config as ScheduleTriggerConfig | undefined;

  const cronDescription = useMemo(
    () => (config ? parseCronExpression(config.cron) : ''),
    [config?.cron],
  );

  const handleCronChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('cron', e.target.value);
    },
    [updateConfig],
  );

  const handleTimezoneChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      updateConfig('timezone', e.target.value);
    },
    [updateConfig],
  );

  const handleEnabledChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('enabled', e.target.checked);
    },
    [updateConfig],
  );

  const handleCronExampleClick = useCallback(
    (expression: string) => {
      updateConfig('cron', expression);
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Schedule Status */}
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-md text-xs',
          'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
        )}
      >
        {isScheduleLoading ? (
          <span className="text-[var(--color-text-muted)]">Checking...</span>
        ) : scheduleStatus?.active ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)] shrink-0" />
            <div className="min-w-0">
              <span className="text-[var(--color-text)]">Schedule Active</span>
              <span className="block text-[10px] text-[var(--color-text-muted)] truncate">
                {scheduleStatus.scheduleId}
              </span>
            </div>
          </>
        ) : config?.enabled ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-warning)] shrink-0" />
            <span className="text-[var(--color-text-muted)]">Not deployed — save workflow to activate</span>
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-border)] shrink-0" />
            <span className="text-[var(--color-text-muted)]">Schedule disabled</span>
          </>
        )}
      </div>

      {/* Enabled Toggle */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="scheduleEnabled"
          className="text-xs text-[var(--color-text)] cursor-pointer select-none font-medium"
        >
          Schedule Enabled
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="scheduleEnabled"
            checked={config.enabled}
            onChange={handleEnabledChange}
            className="sr-only peer"
          />
          <div
            className={clsx(
              'w-9 h-5 rounded-full transition-colors',
              'bg-[var(--color-border)] peer-checked:bg-[var(--color-accent)]',
              'after:content-[""] after:absolute after:top-0.5 after:left-0.5',
              'after:bg-white after:rounded-full after:h-4 after:w-4',
              'after:transition-transform peer-checked:after:translate-x-4',
            )}
          />
        </label>
      </div>

      {/* Cron Expression */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Cron Expression
        </label>
        <input
          type="text"
          value={config.cron}
          onChange={handleCronChange}
          placeholder="0 * * * *"
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs font-mono',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast',
          )}
          aria-label="Cron expression"
        />
        {/* Parsed description */}
        <div
          className={clsx(
            'px-3 py-2 rounded-md text-xs',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)]',
          )}
        >
          {cronDescription}
        </div>
      </div>

      {/* Cron Field Reference */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Format: minute hour day-of-month month day-of-week
        </label>
        <div className="flex gap-1.5">
          {['MIN', 'HOUR', 'DOM', 'MON', 'DOW'].map((field) => (
            <div
              key={field}
              className={clsx(
                'flex-1 text-center py-1 rounded-md text-[9px] font-bold uppercase',
                'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
                'border border-[var(--color-border)]',
              )}
            >
              {field}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Examples */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CRON_EXAMPLES.map((example) => (
            <button
              key={example.expression}
              type="button"
              onClick={() => handleCronExampleClick(example.expression)}
              className={clsx(
                'px-2 py-1 rounded-md text-[10px]',
                'border transition-all-fast',
                config.cron === example.expression
                  ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]',
              )}
              title={example.expression}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Timezone
        </label>
        <select
          value={config.timezone}
          onChange={handleTimezoneChange}
          className={clsx(
            'w-full px-3 py-2 rounded-md text-xs',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text)]',
            'outline-none focus:border-[var(--color-accent)]',
            'transition-all-fast cursor-pointer',
          )}
          aria-label="Timezone"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
