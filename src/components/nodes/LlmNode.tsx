import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { WorkflowNodeData, LlmConfig } from '@/types';
import BaseNode from './BaseNode';

// ─── Provider badge colors ──────────────────────────────────────────────────

const PROVIDER_CLASSES: Record<string, string> = {
  anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  openai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

// ─── Component ──────────────────────────────────────────────────────────────

function LlmNodeInner(props: NodeProps) {
  const data = props.data as WorkflowNodeData;
  const config = data.config as LlmConfig | undefined;
  if (!config) return <BaseNode {...props} data={data} />;
  const providerClass = PROVIDER_CLASSES[config.provider] ?? PROVIDER_CLASSES.anthropic;

  const providerLabel = config.provider === 'anthropic' ? 'Anthropic' : 'OpenAI';

  const model = config.model ?? '';
  const truncatedModel =
    model.length > 25 ? `${model.slice(0, 25)}...` : model;

  const userPrompt = config.userPrompt ?? '';
  const truncatedPrompt =
    userPrompt.length > 40
      ? `${userPrompt.slice(0, 40)}...`
      : userPrompt;

  return (
    <BaseNode {...props} data={data}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide flex-shrink-0',
              providerClass,
            )}
          >
            {providerLabel}
          </span>
          <span
            className="text-[11px] truncate flex-1"
            style={{ color: 'var(--color-text-muted)' }}
            title={model}
          >
            {truncatedModel}
          </span>
        </div>
        {userPrompt && (
          <span
            className="text-[10px] truncate"
            style={{ color: 'var(--color-text-muted)' }}
            title={userPrompt}
          >
            {truncatedPrompt}
          </span>
        )}
      </div>
    </BaseNode>
  );
}

const LlmNode = memo(LlmNodeInner);
export default LlmNode;
