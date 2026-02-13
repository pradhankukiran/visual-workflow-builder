import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { setWorkflowMeta } from '@/features/workflow/workflowSlice';
import { addToast } from '@/features/toast/toastSlice';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useAutoSave } from '@/hooks/useAutoSave';
import ThemeToggle from '@/components/shared/ThemeToggle';
import ExecutionControls from '@/components/execution/ExecutionControls';

export default function Header() {
  const dispatch = useAppDispatch();
  const workflowName = useAppSelector((state) => state.workflow.name);
  const isDirty = useAppSelector((state) => state.workflow.isDirty);
  const { canUndo, canRedo, handleUndo, handleRedo } = useUndoRedo();
  const { saveNow, isSaving } = useAutoSave();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflowName);
  const [menuOpen, setMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedName(workflowName);
  }, [workflowName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleNameSubmit = useCallback(() => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== workflowName) {
      dispatch(setWorkflowMeta({ name: trimmed }));
    } else {
      setEditedName(workflowName);
    }
    setIsEditingName(false);
  }, [editedName, workflowName, dispatch]);

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleNameSubmit();
      } else if (e.key === 'Escape') {
        setEditedName(workflowName);
        setIsEditingName(false);
      }
    },
    [handleNameSubmit, workflowName],
  );

  const handleSave = useCallback(() => {
    saveNow();
  }, [saveNow]);

  const handleMenuAction = useCallback(
    (action: 'new' | 'import' | 'export') => {
      setMenuOpen(false);
      switch (action) {
        case 'new':
          dispatch(addToast({ type: 'info', message: 'New workflow created' }));
          break;
        case 'import':
          dispatch(addToast({ type: 'info', message: 'Import workflow (coming soon)' }));
          break;
        case 'export':
          dispatch(addToast({ type: 'info', message: 'Export workflow (coming soon)' }));
          break;
      }
    },
    [dispatch],
  );

  return (
    <header
      className={clsx(
        'flex items-center h-12 px-4 shrink-0',
        'bg-[var(--color-surface-elevated)]',
        'border-b border-[var(--color-border)]',
        'transition-theme',
      )}
    >
      {/* Left: Workflow name */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className={clsx(
              'text-sm font-semibold px-2 py-1 rounded-md',
              'bg-[var(--color-surface)] border border-[var(--color-accent)]',
              'text-[var(--color-text)] outline-none',
              'w-48',
            )}
            maxLength={64}
            aria-label="Workflow name"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className={clsx(
              'text-sm font-semibold px-2 py-1 rounded-md truncate max-w-48',
              'hover:bg-[var(--color-surface)] transition-all-fast',
              'text-[var(--color-text)]',
            )}
            title="Click to rename"
            aria-label={`Workflow name: ${workflowName}. Click to edit.`}
          >
            {workflowName}
          </button>
        )}

        {/* Dirty indicator */}
        <span
          className={clsx(
            'w-2 h-2 rounded-full shrink-0 transition-all-fast',
            isDirty ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]',
          )}
          title={isDirty ? 'Unsaved changes' : 'All changes saved'}
          aria-label={isDirty ? 'Unsaved changes' : 'All changes saved'}
        />
      </div>

      {/* Center: execution controls */}
      <div className="flex-1 flex justify-center">
        <ExecutionControls />
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={clsx(
            'p-2 rounded-md text-sm transition-all-fast',
            'hover:bg-[var(--color-surface)]',
            'text-[var(--color-text-muted)]',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h7a4 4 0 0 1 0 8H7" />
            <path d="M6 4 3 7l3 3" />
          </svg>
        </button>

        {/* Redo */}
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={clsx(
            'p-2 rounded-md text-sm transition-all-fast',
            'hover:bg-[var(--color-surface)]',
            'text-[var(--color-text-muted)]',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 7H6a4 4 0 0 0 0 8h3" />
            <path d="M10 4l3 3-3 3" />
          </svg>
        </button>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={clsx(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all-fast ml-1',
            'bg-[var(--color-accent)] text-white',
            'hover:bg-[var(--color-accent-hover)]',
            'active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          title="Save workflow"
          aria-label="Save workflow"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        {/* Menu dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={clsx(
              'p-2 rounded-md text-sm transition-all-fast',
              'hover:bg-[var(--color-surface)]',
              'text-[var(--color-text-muted)]',
              menuOpen && 'bg-[var(--color-surface)]',
            )}
            title="Menu"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div
              className={clsx(
                'absolute right-0 top-full mt-1 z-50',
                'w-44 py-1 rounded-lg shadow-lg',
                'bg-[var(--color-surface-elevated)]',
                'border border-[var(--color-border)]',
                'animate-scale-in',
              )}
              role="menu"
            >
              <button
                onClick={() => handleMenuAction('new')}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                  'transition-all-fast',
                )}
                role="menuitem"
              >
                New Workflow
              </button>
              <button
                onClick={() => handleMenuAction('import')}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                  'transition-all-fast',
                )}
                role="menuitem"
              >
                Import JSON
              </button>
              <button
                onClick={() => handleMenuAction('export')}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm',
                  'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                  'transition-all-fast',
                )}
                role="menuitem"
              >
                Export JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
