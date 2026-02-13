import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, ConsoleOutputConfig } from '@/types';
import { useAppSelector } from '@/app/hooks';
import { selectSelectedNodeId } from '@/features/ui/uiSelectors';
import { selectNodeExecutionStatus } from '@/features/execution/executionSelectors';
import { NODE_DEFINITIONS } from '@/constants/nodeDefinitions';
import StatusBadge from '@/components/shared/StatusBadge';

// ─── Format labels ──────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<ConsoleOutputConfig['format'], string> = {
  json: 'JSON',
  text: 'Text',
  table: 'Table',
};

// ─── Component ──────────────────────────────────────────────────────────────

function ConsoleOutputNodeInner(props: NodeProps) {
  const { id } = props;
  const data = props.data as WorkflowNodeData;
  const config = data.config as ConsoleOutputConfig;
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
            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-node-output) 15%, transparent)',
              color: 'var(--color-node-output)',
            }}
          >
            {FORMAT_LABELS[config.format]}
          </span>
          {config.label && (
            <span
              className="text-[11px] truncate"
              style={{ color: 'var(--color-text-muted)' }}
              title={config.label}
            >
              {config.label}
            </span>
          )}
        </div>
      </div>

      {/* Target handle only - no source handle (terminal node) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!opacity-100"
      />
    </div>
  );
}

const ConsoleOutputNode = memo(ConsoleOutputNodeInner);
export default ConsoleOutputNode;
