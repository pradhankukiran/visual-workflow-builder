import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, ConditionalBranchConfig } from '@/types';
import { useAppSelector } from '@/app/hooks';
import { selectSelectedNodeId } from '@/features/ui/uiSelectors';
import { selectNodeExecutionStatus } from '@/features/execution/executionSelectors';
import { NODE_DEFINITIONS } from '@/constants/nodeDefinitions';
import StatusBadge from '@/components/shared/StatusBadge';

// ─── Component ──────────────────────────────────────────────────────────────

function ConditionalBranchNodeInner(props: NodeProps) {
  const { id } = props;
  const data = props.data as WorkflowNodeData;
  const config = data.config as ConditionalBranchConfig;
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

  const conditionCount = config.conditions.length;

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
        <div className="flex items-center justify-between">
          <span
            className="text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {conditionCount} condition{conditionCount !== 1 ? 's' : ''}
          </span>
          <div className="flex flex-col gap-1 text-[10px]">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-success) 15%, transparent)',
                color: 'var(--color-success)',
              }}
            >
              True
            </span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-error) 15%, transparent)',
                color: 'var(--color-error)',
              }}
            >
              False
            </span>
          </div>
        </div>
      </div>

      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="!opacity-100"
      />

      {/* Two source handles: true (top-right), false (bottom-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!opacity-100"
        style={{ top: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!opacity-100"
        style={{ top: '70%' }}
      />
    </div>
  );
}

const ConditionalBranchNode = memo(ConditionalBranchNodeInner);
export default ConditionalBranchNode;
