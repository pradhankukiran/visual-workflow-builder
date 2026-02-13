import { useCallback } from 'react';
import clsx from 'clsx';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { removeToast } from '@/features/toast/toastSlice';
import { selectActiveToasts } from '@/features/toast/toastSelectors';
import ToastMessage from '@/components/toast/ToastMessage';

export default function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(selectActiveToasts);

  const handleDismiss = useCallback(
    (id: string) => {
      dispatch(removeToast(id));
    },
    [dispatch],
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-[200]',
        'flex flex-col-reverse gap-2',
        'max-w-sm w-full pointer-events-none',
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastMessage
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onDismiss={handleDismiss}
          />
        </div>
      ))}
    </div>
  );
}
