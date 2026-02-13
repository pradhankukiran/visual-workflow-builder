import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowNodeData, JsonTransformConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Component ──────────────────────────────────────────────────────────────

function JsonTransformNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as JsonTransformConfig;

  const truncatedExpr =
    config.expression.length > 40
      ? `${config.expression.slice(0, 40)}...`
      : config.expression;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex flex-col gap-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Transform
        </span>
        <code
          className="text-[11px] font-mono px-1.5 py-0.5 rounded-md"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
            color: 'var(--color-text)',
          }}
          title={config.expression}
        >
          {truncatedExpr || '.'}
        </code>
      </div>
    </BaseNode>
  );
}

const JsonTransformNode = memo(JsonTransformNodeInner);
export default JsonTransformNode;
