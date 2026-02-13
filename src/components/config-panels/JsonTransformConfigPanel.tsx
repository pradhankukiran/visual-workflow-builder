import { useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import ExpressionInput from '@/components/shared/ExpressionInput';
import KeyValueEditor from '@/components/shared/KeyValueEditor';
import type { JsonTransformConfig } from '@/types';

function recordToEntries(record: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function entriesToRecord(entries: Array<{ key: string; value: string }>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key.trim()) {
      record[entry.key] = entry.value;
    }
  }
  return record;
}

/**
 * Generate a simple preview of what the expression might match.
 */
function expressionPreview(expression: string): string {
  if (!expression || expression === '.') {
    return 'Selects the entire input object';
  }
  if (expression.startsWith('.')) {
    const path = expression.slice(1);
    return `Selects the "${path}" field from the input`;
  }
  if (expression.startsWith('[')) {
    return `Selects array element(s): ${expression}`;
  }
  return `Applies expression: ${expression}`;
}

export default function JsonTransformConfigPanel() {
  const { selectedNode, updateConfig } = useNodeConfigPanel();

  const config = selectedNode?.data.config as JsonTransformConfig | undefined;

  const mappingEntries = useMemo(
    () => (config ? recordToEntries(config.inputMapping) : []),
    [config],
  );

  const preview = useMemo(
    () => (config ? expressionPreview(config.expression) : ''),
    [config],
  );

  const handleExpressionChange = useCallback(
    (expression: string) => updateConfig('expression', expression),
    [updateConfig],
  );

  const handleMappingChange = useCallback(
    (entries: Array<{ key: string; value: string }>) => {
      updateConfig('inputMapping', entriesToRecord(entries));
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  return (
    <div className="space-y-4">
      {/* Expression */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.expression}
          onChange={handleExpressionChange}
          placeholder=".data.items[0].name"
          label="Transform Expression"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Use jq-like syntax to extract and transform JSON data. Start with <code className="px-1 py-0.5 rounded-md bg-[var(--color-surface)] font-mono text-[var(--color-accent)]">.</code> to reference the input object.
        </p>
      </div>

      {/* Input Mapping */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Input Mapping
        </label>
        <KeyValueEditor
          entries={mappingEntries}
          onChange={handleMappingChange}
          keyPlaceholder="Output Key"
          valuePlaceholder="Source Path"
        />
        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Map output keys to source paths from upstream node data.
        </p>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Preview
        </label>
        <div
          className={clsx(
            'px-3 py-3 rounded-lg text-xs leading-relaxed',
            'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
            'text-[var(--color-text-muted)] font-mono',
          )}
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
            Expression Result
          </div>
          <div className="text-[var(--color-text)]">{preview}</div>
          {Object.keys(config.inputMapping).length > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-1">
                Mapped Output
              </div>
              {Object.entries(config.inputMapping).map(([key, val]) => (
                <div key={key} className="text-[var(--color-text)]">
                  <span className="text-[var(--color-accent)]">{key}</span>
                  <span className="text-[var(--color-text-muted)]"> &larr; </span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
