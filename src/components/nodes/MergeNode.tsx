import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, MergeConfig } from '@/types';
import { useAppSelector } from '@/app/hooks';
import { selectSelectedNodeId } from '@/features/ui/uiSelectors';
import { selectNodeExecutionStatus } from '@/features/execution/executionSelectors';
import { NODE_DEFINITIONS } from '@/constants/nodeDefinitions';
import StatusBadge from '@/components/shared/StatusBadge';

// ─── Helpers ────────────────────────────────────────────────────────────────

const STRATEGY_LABELS: Record<MergeConfig['strategy'], string> = {
  waitAll: 'Wait All',
  waitAny: 'Wait Any',
  combineArrays: 'Combine',
};

// ─── Component ──────────────────────────────────────────────────────────────

function MergeNodeInner(props: NodeProps) {
  const { id } = props;
  const data = props.data as WorkflowNodeData;
  const config = data.config as MergeConfig;
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

  const strategyLabel = STRATEGY_LABELS[config.strategy];

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
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          {strategyLabel}
        </span>
      </div>

      {/* Multiple target handles (left-top, left-bottom) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-a"
        className="!opacity-100"
        style={{ top: '35%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-b"
        className="!opacity-100"
        style={{ top: '65%' }}
      />

      {/* Single source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!opacity-100"
      />
    </div>
  );
}

const MergeNode = memo(MergeNodeInner);
export default MergeNode;
