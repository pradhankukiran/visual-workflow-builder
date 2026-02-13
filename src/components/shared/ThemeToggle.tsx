import { useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { toggleTheme } from '@/features/ui/uiSlice';

export default function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const isDark = theme === 'dark';

  // Sync dark class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const handleToggle = useCallback(() => {
    dispatch(toggleTheme());
  }, [dispatch]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={clsx(
        'p-2 rounded-md transition-all-fast',
        'text-[var(--color-text-muted)]',
        'hover:text-[var(--color-text)]',
        'hover:bg-[var(--color-surface)]',
        'active:scale-95',
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        /* Sun icon for dark mode (click to go light) */
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
        </svg>
      ) : (
        /* Moon icon for light mode (click to go dark) */
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 9.5A6 6 0 0 1 6.5 2 6 6 0 1 0 14 9.5z" />
        </svg>
      )}
    </button>
  );
}
