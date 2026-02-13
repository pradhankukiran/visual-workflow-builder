import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowNodeData, DelayConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(0)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

// ─── Component ──────────────────────────────────────────────────────────────

function DelayNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as DelayConfig;

  const durationStr = formatDuration(config.duration);
  const isRandom = config.type === 'random';
  const maxStr = config.maxDuration
    ? formatDuration(config.maxDuration)
    : null;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-mono font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {isRandom && maxStr ? `${durationStr} - ${maxStr}` : durationStr}
        </span>
        {isRandom && (
          <span
            className="text-[10px] px-1 py-0.5 rounded-md"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-warning) 15%, transparent)',
              color: 'var(--color-warning)',
            }}
          >
            random
          </span>
        )}
      </div>
    </BaseNode>
  );
}

const DelayNode = memo(DelayNodeInner);
export default DelayNode;
