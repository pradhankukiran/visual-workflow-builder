import { useReactFlow } from '@xyflow/react';
import clsx from 'clsx';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectCanvasLocked } from '@/features/ui/uiSelectors';
import { toggleCanvasLock } from '@/features/ui/uiSlice';

// ─── Icon Button ────────────────────────────────────────────────────────────

interface ControlButtonProps {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}

function ControlButton({ title, onClick, children, active }: ControlButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={clsx(
        'flex items-center justify-center w-8 h-8 text-sm transition-colors duration-100 cursor-pointer',
        'hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]',
        active && 'text-[var(--color-accent)]',
      )}
      style={{
        color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CanvasControls() {
  const dispatch = useAppDispatch();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const isLocked = useAppSelector(selectCanvasLocked);

  return (
    <div
      className="absolute bottom-4 left-4 z-10 flex flex-col rounded-lg overflow-hidden"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--color-surface-elevated) 80%, transparent)',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow:
          '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <ControlButton title="Zoom In" onClick={() => zoomIn({ duration: 200 })}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="7" y1="2" x2="7" y2="12" />
          <line x1="2" y1="7" x2="12" y2="7" />
        </svg>
      </ControlButton>
      <ControlButton title="Zoom Out" onClick={() => zoomOut({ duration: 200 })}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="7" x2="12" y2="7" />
        </svg>
      </ControlButton>
      <ControlButton title="Fit View" onClick={() => fitView({ duration: 300, padding: 0.2 })}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,5 1,1 5,1" />
          <polyline points="9,1 13,1 13,5" />
          <polyline points="13,9 13,13 9,13" />
          <polyline points="5,13 1,13 1,9" />
        </svg>
      </ControlButton>
      <ControlButton
        title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'}
        onClick={() => dispatch(toggleCanvasLock())}
        active={isLocked}
      >
        {isLocked ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="10" height="7" rx="1" />
            <path d="M4 6V4a3 3 0 0 1 6 0v2" />
            <circle cx="7" cy="9.5" r="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="10" height="7" rx="1" />
            <path d="M4 6V4a3 3 0 0 1 6 0" />
            <circle cx="7" cy="9.5" r="1" fill="currentColor" />
          </svg>
        )}
      </ControlButton>
    </div>
  );
}
