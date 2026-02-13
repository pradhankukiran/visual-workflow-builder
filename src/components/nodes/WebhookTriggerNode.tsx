import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, WebhookTriggerConfig, HttpMethod } from '@/types';
import { useAppSelector } from '@/app/hooks';
import { selectSelectedNodeId } from '@/features/ui/uiSelectors';
import { selectNodeExecutionStatus } from '@/features/execution/executionSelectors';
import { NODE_DEFINITIONS } from '@/constants/nodeDefinitions';
import StatusBadge from '@/components/shared/StatusBadge';

// ─── HTTP method colors ─────────────────────────────────────────────────────

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string }> = {
  GET: { bg: '#dcfce7', text: '#166534' },
  POST: { bg: '#dbeafe', text: '#1e40af' },
  PUT: { bg: '#fef3c7', text: '#92400e' },
  PATCH: { bg: '#fce7f3', text: '#9d174d' },
  DELETE: { bg: '#fee2e2', text: '#991b1b' },
};

// ─── Component ──────────────────────────────────────────────────────────────

function WebhookTriggerNodeInner(props: NodeProps) {
  const { id } = props;
  const data = props.data as WorkflowNodeData;
  const config = data.config as WebhookTriggerConfig;
  const selectedNodeId = useAppSelector(selectSelectedNodeId);
  const executionResult = useAppSelector((state) =>
    selectNodeExecutionStatus(state, id),
  );

  const isSelected = selectedNodeId === id;
  const definition = NODE_DEFINITIONS[data.type];
  const category = definition.category;
  const executionStatus = executionResult?.status;
  const hasValidationErrors =
    !data.isValid && data.validationErrors.length > 0;

  const statusClass = (() => {
    switch (executionStatus) {
      case 'running':
        return 'running';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'skipped';
      default:
        return null;
    }
  })();

  const badgeStatus = (() => {
    switch (executionStatus) {
      case 'completed':
        return 'success' as const;
      case 'failed':
        return 'error' as const;
      case 'running':
        return 'running' as const;
      case 'skipped':
        return 'skipped' as const;
      default:
        return null;
    }
  })();

  const methodColor = METHOD_COLORS[config.method] ?? METHOD_COLORS.POST;

  return (
    <div
      className={clsx(
        'workflow-node',
        `workflow-node--${category}`,
        isSelected && 'workflow-node--selected',
        statusClass && `workflow-node--${statusClass}`,
        hasValidationErrors && 'workflow-node--error',
      )}
    >
      {/* Header */}
      <div className="workflow-node__header">
        <span className="workflow-node__icon" aria-hidden="true">
          <definition.icon size={14} />
        </span>
        <span className="workflow-node__label">{data.label}</span>
        <div className="workflow-node__status">
          {badgeStatus && <StatusBadge status={badgeStatus} size="sm" />}
          {hasValidationErrors && !badgeStatus && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-error) 15%, transparent)',
                color: 'var(--color-error)',
              }}
              title={data.validationErrors.join(', ')}
              aria-label="Validation errors"
            >
              !
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="workflow-node__body">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide"
            style={{
              backgroundColor: methodColor.bg,
              color: methodColor.text,
            }}
          >
            {config.method}
          </span>
          <span
            className="text-[11px] font-mono truncate flex-1"
            style={{ color: 'var(--color-text-muted)' }}
            title={config.path}
          >
            {config.path || '/'}
          </span>
        </div>
      </div>

      {/* Source handle only - no target handle (trigger node) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!opacity-100"
      />
    </div>
  );
}

const WebhookTriggerNode = memo(WebhookTriggerNodeInner);
export default WebhookTriggerNode;
