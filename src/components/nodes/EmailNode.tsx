import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, EmailConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Body type badge colors ─────────────────────────────────────────────────

const BODY_TYPE_CLASSES: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  html: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

// ─── Component ──────────────────────────────────────────────────────────────

function EmailNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as EmailConfig | undefined;
  if (!config) return <BaseNode {...props} data={data} />;
  const bodyTypeClass = BODY_TYPE_CLASSES[config.bodyType] ?? BODY_TYPE_CLASSES.text;

  const to = config.to ?? '';
  const truncatedTo =
    to.length > 30 ? `${to.slice(0, 30)}...` : to;

  const subject = config.subject ?? '';
  const truncatedSubject =
    subject.length > 35 ? `${subject.slice(0, 35)}...` : subject;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex-shrink-0',
              bodyTypeClass,
            )}
          >
            {(config.bodyType ?? 'text').toUpperCase()}
          </span>
          {to && (
            <span
              className="text-[11px] truncate flex-1"
              style={{ color: 'var(--color-text-muted)' }}
              title={to}
            >
              {truncatedTo}
            </span>
          )}
        </div>
        {subject && (
          <span
            className="text-[10px] truncate"
            style={{ color: 'var(--color-text-muted)' }}
            title={subject}
          >
            {truncatedSubject}
          </span>
        )}
      </div>
    </BaseNode>
  );
}

const EmailNode = memo(EmailNodeInner);
export default EmailNode;
