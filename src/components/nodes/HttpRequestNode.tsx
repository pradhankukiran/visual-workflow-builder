import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, HttpRequestConfig, HttpMethod } from '@/types';
import BaseNode from './BaseNode';

// ─── HTTP method color mapping ──────────────────────────────────────────────

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string }> = {
  GET: { bg: '#dcfce7', text: '#166534' },
  POST: { bg: '#dbeafe', text: '#1e40af' },
  PUT: { bg: '#fef3c7', text: '#92400e' },
  PATCH: { bg: '#fce7f3', text: '#9d174d' },
  DELETE: { bg: '#fee2e2', text: '#991b1b' },
};

// ─── Component ──────────────────────────────────────────────────────────────

function HttpRequestNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as HttpRequestConfig;
  const methodColor = METHOD_COLORS[config.method] ?? METHOD_COLORS.GET;

  const truncatedUrl =
    config.url.length > 35 ? `${config.url.slice(0, 35)}...` : config.url;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide',
          )}
          style={{
            backgroundColor: methodColor.bg,
            color: methodColor.text,
          }}
        >
          {config.method}
        </span>
        <span
          className="text-[11px] truncate flex-1"
          style={{ color: 'var(--color-text-muted)' }}
          title={config.url}
        >
          {truncatedUrl || 'No URL set'}
        </span>
      </div>
    </BaseNode>
  );
}

const HttpRequestNode = memo(HttpRequestNodeInner);
export default HttpRequestNode;
