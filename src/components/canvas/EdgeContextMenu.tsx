import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { removeEdge } from '@/features/workflow/workflowSlice';

// ─── Props ──────────────────────────────────────────────────────────────────

interface EdgeContextMenuProps {
  edgeId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onAddLabel?: (edgeId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EdgeContextMenu({
  edgeId,
  position,
  onClose,
  onAddLabel,
}: EdgeContextMenuProps) {
  const dispatch = useAppDispatch();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  // Close on Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Focus the menu when it opens for accessibility
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  const handleDelete = () => {
    dispatch(removeEdge(edgeId));
    onClose();
  };

  const handleAddLabel = () => {
    onAddLabel?.(edgeId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      className="fixed z-50 min-w-[160px] py-1 rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: 'var(--color-surface-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow:
          '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
      }}
    >
      <button
        role="menuitem"
        onClick={handleAddLabel}
        className="w-full text-left px-3 py-2 text-[13px] transition-colors duration-100 cursor-pointer"
        style={{ color: 'var(--color-text)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            'color-mix(in srgb, var(--color-accent) 10%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span className="mr-2" aria-hidden="true">
          Tag
        </span>
        Add Label
      </button>
      <div
        className="mx-2 my-0.5"
        style={{
          borderTop: '1px solid var(--color-border)',
        }}
      />
      <button
        role="menuitem"
        onClick={handleDelete}
        className="w-full text-left px-3 py-2 text-[13px] transition-colors duration-100 cursor-pointer"
        style={{ color: 'var(--color-error)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            'color-mix(in srgb, var(--color-error) 10%, transparent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span className="mr-2" aria-hidden="true">
          X
        </span>
        Delete Edge
      </button>
    </div>
  );
}
