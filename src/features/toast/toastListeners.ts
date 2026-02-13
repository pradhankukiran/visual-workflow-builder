import { startAppListening } from '@/app/listenerMiddleware';
import { addToast, removeToast } from './toastSlice';

/**
 * Auto-dismiss listener for toasts.
 *
 * When a toast is added, this listener waits for the toast's configured
 * duration then automatically removes it. If the same toast is manually
 * dismissed before the timer fires, the `cancelActiveListeners` / fork
 * pattern ensures no stale dispatch occurs.
 */
startAppListening({
  actionCreator: addToast,
  effect: async (action, listenerApi) => {
    const toast = action.payload;

    // Wait for the toast's configured duration.
    await listenerApi.delay(toast.duration);

    // Check if the toast still exists before removing it.
    // It may have been manually dismissed already.
    const state = listenerApi.getState();
    const toastState = state.toast;
    if (toastState.ids.includes(toast.id)) {
      listenerApi.dispatch(removeToast(toast.id));
    }
  },
});
