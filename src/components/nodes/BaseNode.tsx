import { type ReactNode, memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, NodeType } from '@/types';
import { useAppSelector } from '@/app/hooks';
import { selectSelectedNodeId } from '@/features/ui/uiSelectors';
import { selectNodeExecutionStatus } from '@/features/execution/executionSelectors';
import { NODE_DEFINITIONS, type NodeCategory } from '@/constants/nodeDefinitions';
import StatusBadge from '@/components/shared/StatusBadge';

// ─── Trigger and terminal node detection ────────────────────────────────────

const TRIGGER_TYPES: ReadonlySet<NodeType> = new Set([
  'webhookTrigger',
  'scheduleTrigger',
]);

const TERMINAL_TYPES: ReadonlySet<NodeType> = new Set(['consoleOutput']);

// ─── Props ──────────────────────────────────────────────────────────────────

interface BaseNodeProps extends NodeProps {
  data: WorkflowNodeData;
  children?: ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

function BaseNodeInner({ id, data, children }: BaseNodeProps) {
  const selectedNodeId = useAppSelector(selectSelectedNodeId);
  const executionResult = useAppSelector((state) =>
    selectNodeExecutionStatus(state, id),
  );

  const isSelected = selectedNodeId === id;
  const definition = NODE_DEFINITIONS[data.type];
  const category: NodeCategory = definition.category;
  const isTrigger = TRIGGER_TYPES.has(data.type);
  const isTerminal = TERMINAL_TYPES.has(data.type);
  const executionStatus = executionResult?.status;
  const hasValidationErrors =
    !data.isValid && data.validationErrors.length > 0;

  // Map NodeExecutionStatus to CSS class suffixes and StatusBadge values
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

  // StatusBadge expects 'success' for completed, 'error' for failed
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
      {children && <div className="workflow-node__body">{children}</div>}

      {/* Handles */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="!opacity-100"
        />
      )}
      {!isTerminal && (
        <Handle
          type="source"
          position={Position.Right}
          id="source"
          className="!opacity-100"
        />
      )}
    </div>
  );
}

const BaseNode = memo(BaseNodeInner);
export default BaseNode;
