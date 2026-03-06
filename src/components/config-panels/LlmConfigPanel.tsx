import { useCallback, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useNodeConfigPanel } from '@/hooks/useNodeConfigPanel';
import ExpressionInput from '@/components/shared/ExpressionInput';
import CredentialSelector from '@/components/shared/CredentialSelector';
import type { LlmConfig, LlmProvider } from '@/types';

// ─── Model definitions per provider ─────────────────────────────────────────

const PROVIDER_MODELS: Record<LlmProvider, Array<{ value: string; label: string }>> = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-haiku-4-20250414', label: 'Claude Haiku 4' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
};

// ─── Shared input class ─────────────────────────────────────────────────────

const inputClasses = clsx(
  'w-full px-3 py-2 rounded-md text-xs',
  'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
  'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
  'outline-none focus:border-[var(--color-accent)]',
  'transition-all-fast',
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function LlmConfigPanel() {
  const { selectedNode, updateConfig, updateConfigBatch } = useNodeConfigPanel();

  const config = selectedNode?.data.config as LlmConfig | undefined;

  const handleProviderChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const provider = e.target.value as LlmProvider;
      const firstModel = PROVIDER_MODELS[provider][0].value;
      updateConfigBatch({ provider, model: firstModel });
    },
    [updateConfigBatch],
  );

  const handleModelChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => updateConfig('model', e.target.value),
    [updateConfig],
  );

  const handleApiKeyChange = useCallback(
    (key: string) => updateConfig('apiKey', key),
    [updateConfig],
  );

  const handleCredentialChange = useCallback(
    (credentialId: string | undefined) => {
      if (credentialId) {
        updateConfigBatch({ credentialId, apiKey: '' });
      } else {
        updateConfig('credentialId', credentialId);
      }
    },
    [updateConfig, updateConfigBatch],
  );

  const handleSystemPromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => updateConfig('systemPrompt', e.target.value),
    [updateConfig],
  );

  const handleUserPromptChange = useCallback(
    (value: string) => updateConfig('userPrompt', value),
    [updateConfig],
  );

  const handleTemperatureChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateConfig('temperature', parseFloat(e.target.value));
    },
    [updateConfig],
  );

  const handleMaxTokensChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 0) {
        updateConfig('maxTokens', val);
      }
    },
    [updateConfig],
  );

  if (!selectedNode || !config) return null;

  const models = PROVIDER_MODELS[config.provider] ?? PROVIDER_MODELS.anthropic;

  return (
    <div className="space-y-4">
      {/* Provider */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Provider
        </label>
        <select
          value={config.provider}
          onChange={handleProviderChange}
          className={inputClasses}
          aria-label="LLM Provider"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      {/* Model */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Model
        </label>
        <select
          value={config.model}
          onChange={handleModelChange}
          className={inputClasses}
          aria-label="Model"
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          API Key
        </label>
        <CredentialSelector
          value={config.credentialId}
          onChange={handleCredentialChange}
          apiKey={config.apiKey}
          onApiKeyChange={handleApiKeyChange}
        />
        <p className="text-[10px] text-[var(--color-text-muted)]">
          Your API key is stored in the workflow data, scoped to your account.
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          System Prompt
        </label>
        <textarea
          value={config.systemPrompt}
          onChange={handleSystemPromptChange}
          placeholder="You are a helpful assistant..."
          rows={3}
          className={clsx(inputClasses, 'resize-y')}
          aria-label="System Prompt"
        />
      </div>

      {/* User Prompt */}
      <div className="space-y-2">
        <ExpressionInput
          value={config.userPrompt}
          onChange={handleUserPromptChange}
          placeholder="Enter prompt or use {{expression}}"
          label="User Prompt"
        />
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Temperature
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={config.temperature}
            onChange={handleTemperatureChange}
            className="flex-1 accent-[var(--color-accent)]"
            aria-label="Temperature"
          />
          <span className="text-xs text-[var(--color-text-muted)] shrink-0 w-8 text-right">
            {config.temperature.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Max Tokens
        </label>
        <input
          type="number"
          value={config.maxTokens}
          onChange={handleMaxTokensChange}
          min={1}
          step={256}
          className={inputClasses}
          aria-label="Max Tokens"
        />
      </div>
    </div>
  );
}
