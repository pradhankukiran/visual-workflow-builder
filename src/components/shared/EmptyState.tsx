import clsx from 'clsx';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center',
        'py-12 px-6 text-center',
        'select-none',
      )}
    >
      {/* Icon */}
      <div
        className={clsx(
          'flex items-center justify-center w-16 h-16 mb-4 rounded-2xl',
          'bg-[var(--color-surface)] text-3xl',
          'opacity-50',
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{title}</h3>

      {/* Description */}
      <p className="text-xs text-[var(--color-text-muted)] max-w-xs leading-relaxed mb-4">
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={clsx(
            'px-4 py-2 rounded-lg text-xs font-medium',
            'bg-[var(--color-accent)] text-white',
            'hover:bg-[var(--color-accent-hover)]',
            'transition-all-fast active:scale-[0.98]',
            'shadow-sm',
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
