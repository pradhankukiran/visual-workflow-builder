import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowNodeData, VariableSetConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Component ──────────────────────────────────────────────────────────────

function VariableSetNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as VariableSetConfig;

  const truncatedValue =
    config.value.length > 25 ? `${config.value.slice(0, 25)}...` : config.value;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[11px] font-mono font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {config.variableName || 'unnamed'}
        </span>
        <span
          className="text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          =
        </span>
        <span
          className="text-[11px] font-mono truncate"
          style={{ color: 'var(--color-text-muted)' }}
          title={config.value}
        >
          {truncatedValue || '...'}
        </span>
      </div>
    </BaseNode>
  );
}

const VariableSetNode = memo(VariableSetNodeInner);
export default VariableSetNode;
