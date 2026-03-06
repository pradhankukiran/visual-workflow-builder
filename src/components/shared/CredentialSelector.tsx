import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { useGetCredentialsQuery } from '@/features/credentials/credentialsApi';

interface CredentialSelectorProps {
  value: string | undefined; // credentialId
  onChange: (credentialId: string | undefined) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const inputClasses = clsx(
  'w-full px-3 py-2 rounded-md text-xs',
  'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
  'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
  'outline-none focus:border-[var(--color-accent)]',
  'transition-all-fast',
);

export default function CredentialSelector({ value, onChange, apiKey, onApiKeyChange }: CredentialSelectorProps) {
  const { data: credentials } = useGetCredentialsQuery();
  const [mode, setMode] = useState<'manual' | 'saved'>(value ? 'saved' : 'manual');

  useEffect(() => {
    setMode(value ? 'saved' : 'manual');
  }, [value]);

  const handleModeToggle = useCallback(() => {
    if (mode === 'manual') {
      setMode('saved');
      onApiKeyChange('');
    } else {
      setMode('manual');
      onChange(undefined);
    }
  }, [mode, onChange, onApiKeyChange]);

  const handleCredentialChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const selected = e.target.value;
      onChange(selected || undefined);
    },
    [onChange],
  );

  const handleApiKeyChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onApiKeyChange(e.target.value);
    },
    [onApiKeyChange],
  );

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleModeToggle}
        className="text-[10px] text-[var(--color-accent)] hover:underline"
      >
        {mode === 'manual' ? 'Use saved credential' : 'Enter manually'}
      </button>

      {mode === 'saved' ? (
        <select
          value={value ?? ''}
          onChange={handleCredentialChange}
          className={inputClasses}
          aria-label="Saved credential"
        >
          <option value="">Select a credential...</option>
          {credentials?.map((cred) => (
            <option key={cred.id} value={cred.id}>
              {cred.name} ({cred.type})
            </option>
          ))}
        </select>
      ) : (
        <input
          type="password"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="sk-..."
          className={inputClasses}
          aria-label="API Key"
        />
      )}
    </div>
  );
}
