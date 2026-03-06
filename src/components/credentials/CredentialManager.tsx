import { useState, useCallback, useEffect, type ChangeEvent, type FormEvent } from 'react';
import clsx from 'clsx';
import { X, Trash2, Plus } from 'lucide-react';
import {
  useGetCredentialsQuery,
  useCreateCredentialMutation,
  useDeleteCredentialMutation,
} from '@/features/credentials/credentialsApi';
import { useAppDispatch } from '@/app/hooks';
import { addToast } from '@/features/toast/toastSlice';

interface CredentialManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputClasses = clsx(
  'w-full px-3 py-2 rounded-md text-xs',
  'bg-[var(--color-surface-elevated)] border border-[var(--color-border)]',
  'text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
  'outline-none focus:border-[var(--color-accent)]',
  'transition-all-fast',
);

export default function CredentialManager({ isOpen, onClose }: CredentialManagerProps) {
  const dispatch = useAppDispatch();
  const { data: credentials, isLoading } = useGetCredentialsQuery(undefined, { skip: !isOpen });
  const [createCredential, { isLoading: isCreating }] = useCreateCredentialMutation();
  const [deleteCredential] = useDeleteCredentialMutation();

  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('api-key');
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !value.trim()) return;
      try {
        await createCredential({ name: name.trim(), type, value: value.trim() }).unwrap();
        setName('');
        setType('api-key');
        setValue('');
        setShowForm(false);
      } catch {
        dispatch(addToast({ type: 'error', message: 'Failed to save credential' }));
      }
    },
    [name, type, value, createCredential, dispatch],
  );

  const handleDeleteConfirm = useCallback(
    async () => {
      if (!deleteId) return;
      try {
        await deleteCredential(deleteId).unwrap();
      } catch {
        dispatch(addToast({ type: 'error', message: 'Failed to delete credential' }));
      } finally {
        setDeleteId(null);
      }
    },
    [deleteId, deleteCredential, dispatch],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-manager-title"
        className={clsx(
          'relative w-full max-w-lg mx-4 rounded-xl shadow-2xl',
          'bg-[var(--color-surface-elevated)]',
          'border border-[var(--color-border)]',
          'animate-scale-in',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 id="credential-manager-title" className="text-sm font-semibold text-[var(--color-text)]">Credential Vault</h2>
          <button
            onClick={onClose}
            className={clsx(
              'p-1 rounded-md transition-all-fast',
              'hover:bg-[var(--color-surface)]',
              'text-[var(--color-text-muted)]',
            )}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-xs text-[var(--color-text-muted)]">Loading...</p>
          ) : credentials && credentials.length > 0 ? (
            <ul className="space-y-2">
              {credentials.map((cred) => (
                <li
                  key={cred.id}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-md',
                    'bg-[var(--color-surface)] border border-[var(--color-border)]',
                  )}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-xs font-medium text-[var(--color-text)] truncate">
                      {cred.name}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {cred.type} &middot; {new Date(cred.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {deleteId === cred.id ? (
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className="text-[10px] text-[var(--color-text-muted)]">Delete?</span>
                      <button
                        onClick={handleDeleteConfirm}
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          'bg-[var(--color-error)] text-white',
                          'hover:opacity-90 transition-all-fast',
                        )}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className={clsx(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                          'transition-all-fast',
                        )}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(cred.id)}
                      className={clsx(
                        'p-1.5 rounded-md transition-all-fast ml-2 shrink-0',
                        'hover:bg-[var(--color-error)]/10 text-[var(--color-text-muted)]',
                        'hover:text-[var(--color-error)]',
                      )}
                      aria-label={`Delete ${cred.name}`}
                      title="Delete credential"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              No credentials saved yet. Add one below.
            </p>
          )}

          {/* Add form */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="My API Key"
                  className={inputClasses}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value)}
                  className={inputClasses}
                >
                  <option value="api-key">API Key</option>
                  <option value="bearer-token">Bearer Token</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Value
                </label>
                <input
                  type="password"
                  value={value}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
                  placeholder="sk-..."
                  className={inputClasses}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isCreating || !name.trim() || !value.trim()}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-all-fast',
                    'bg-[var(--color-accent)] text-white',
                    'hover:bg-[var(--color-accent-hover)]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isCreating ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all-fast"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className={clsx(
                'mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
                'text-[var(--color-accent)] hover:bg-[var(--color-surface)]',
                'transition-all-fast',
              )}
            >
              <Plus size={14} />
              Add Credential
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
