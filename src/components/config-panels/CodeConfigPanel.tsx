import { useCallback } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import CodeEditor from '@/components/shared/CodeEditor';
import type { CodeConfig } from '@/types';

export default function CodeConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as CodeConfig | undefined;

  const handleCodeChange = useCallback(
    (code: string) => updateConfig('code', code),
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Language Indicator */}
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
            'bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]',
            'text-[var(--color-success)]',
            'border border-[color-mix(in_srgb,var(--color-success)_20%,transparent)]',
          )}
        >
          {config.language}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          Custom code execution
        </span>
      </div>

      {/* Code Editor */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Code
        </label>
        <CodeEditor
          value={config.code}
          onChange={handleCodeChange}
          language={config.language}
          placeholder="// Write your code here\nreturn input;"
        />
      </div>

      {/* Help Card */}
      <div
        className={clsx(
          'px-3 py-3 rounded-lg text-xs leading-relaxed space-y-2',
          'bg-[color-mix(in_srgb,var(--color-info)_8%,transparent)]',
          'border border-[color-mix(in_srgb,var(--color-info)_20%,transparent)]',
          'text-[var(--color-text-muted)]',
        )}
      >
        <div className="font-semibold text-[var(--color-info)]">Available Variables</div>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)] shrink-0 text-[11px]">input</code>
            <span>Data from upstream nodes</span>
          </li>
          <li className="flex items-start gap-2">
            <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)] shrink-0 text-[11px]">context</code>
            <span>Workflow variables and execution metadata</span>
          </li>
        </ul>
        <div className="pt-1 border-t border-[color-mix(in_srgb,var(--color-info)_15%,transparent)]">
          <p>Return a value to pass it downstream to the next node in the workflow.</p>
        </div>
      </div>
    </div>
  );
}
