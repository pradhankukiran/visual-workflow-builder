import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowNodeData, VariableGetConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Component ──────────────────────────────────────────────────────────────

function VariableGetNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as VariableGetConfig;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[11px] font-mono font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {config.variableName || 'unnamed'}
        </span>
        {config.defaultValue !== undefined && config.defaultValue !== '' && (
          <>
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              default:
            </span>
            <span
              className="text-[10px] font-mono truncate"
              style={{ color: 'var(--color-text-muted)' }}
              title={config.defaultValue}
            >
              {config.defaultValue.length > 20
                ? `${config.defaultValue.slice(0, 20)}...`
                : config.defaultValue}
            </span>
          </>
        )}
      </div>
    </BaseNode>
  );
}

const VariableGetNode = memo(VariableGetNodeInner);
export default VariableGetNode;
