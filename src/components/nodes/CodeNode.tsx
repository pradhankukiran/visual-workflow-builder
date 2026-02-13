import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowNodeData, CodeConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Component ──────────────────────────────────────────────────────────────

function CodeNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as CodeConfig;

  // Show the first non-empty line of code as a preview
  const firstLine =
    config.code
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith('//')) ??
    config.code.split('\n')[0] ??
    '';

  const truncatedLine =
    firstLine.length > 35 ? `${firstLine.slice(0, 35)}...` : firstLine;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex items-start gap-2">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex-shrink-0"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-success) 15%, transparent)',
            color: 'var(--color-success)',
          }}
        >
          JS
        </span>
        <code
          className="text-[11px] font-mono truncate flex-1"
          style={{ color: 'var(--color-text-muted)' }}
          title={firstLine}
        >
          {truncatedLine || 'No code'}
        </code>
      </div>
    </BaseNode>
  );
}

const CodeNode = memo(CodeNodeInner);
export default CodeNode;
