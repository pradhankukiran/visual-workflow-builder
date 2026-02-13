import { useCallback } from 'react';
import clsx from 'clsx';
import { useAppDispatch } from '@/app/hooks';
import { loadWorkflow } from '@/features/workflow/workflowSlice';
import { addToast } from '@/features/toast/toastSlice';
import { cloneWorkflow } from '@/utils/cloneWorkflow';
import type { Workflow } from '@/types';

interface TemplateCardProps {
  template: Workflow;
  onUse?: () => void;
}

export default function TemplateCard({ template, onUse }: TemplateCardProps) {
  const dispatch = useAppDispatch();

  const handleUseTemplate = useCallback(() => {
    // Clone the template to generate fresh IDs so it becomes a new workflow
    const newWorkflow = cloneWorkflow(template, template.name);
    dispatch(loadWorkflow(newWorkflow));
    dispatch(
      addToast({
        type: 'success',
        message: `Created workflow from template "${template.name}"`,
      }),
    );
    onUse?.();
  }, [dispatch, template, onUse]);

  return (
    <div
      className={clsx(
        'flex flex-col p-4 rounded-lg',
        'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
        'hover:border-[var(--color-text-muted)] hover:shadow-md',
        'transition-all-fast',
      )}
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--color-text)] truncate mb-1">
        {template.name}
      </h3>

      {/* Description */}
      <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mb-3 min-h-[2.5em]">
        {template.description || 'No description'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={clsx(
            'flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]',
            'px-1.5 py-0.5 rounded-md',
            'bg-[var(--color-surface)]',
          )}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="opacity-50">
            <rect x="1" y="1" width="8" height="8" rx="2" />
          </svg>
          {template.nodes.length} node{template.nodes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag) => (
            <span
              key={tag}
              className={clsx(
                'px-1.5 py-0.5 rounded-md text-[9px] font-medium',
                'bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]',
                'text-[var(--color-accent)]',
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Use Template button */}
      <button
        type="button"
        onClick={handleUseTemplate}
        className={clsx(
          'mt-auto w-full px-3 py-1.5 rounded-md text-xs font-medium',
          'border border-[var(--color-accent)]',
          'text-[var(--color-accent)] bg-transparent',
          'hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]',
          'transition-all-fast active:scale-[0.98]',
        )}
      >
        Use Template
      </button>
    </div>
  );
}
