import { isRejected } from '@reduxjs/toolkit';
import { startAppListening } from '@/app/listenerMiddleware';
import {
  executionCompleted,
  executionFailed,
  executionCancelled,
} from './executionActions';
import { addToast } from '@/features/toast/toastSlice';

// ─── Execution completed ─────────────────────────────────────────────────────

startAppListening({
  actionCreator: executionCompleted,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(
      addToast({
        type: 'success',
        message: 'Workflow completed successfully',
      }),
    );
  },
});

// ─── Execution failed ────────────────────────────────────────────────────────

startAppListening({
  actionCreator: executionFailed,
  effect: (action, listenerApi) => {
    const { error } = action.payload;
    listenerApi.dispatch(
      addToast({
        type: 'error',
        message: `Workflow failed: ${error}`,
      }),
    );
  },
});

// ─── Execution cancelled ─────────────────────────────────────────────────────

startAppListening({
  actionCreator: executionCancelled,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(
      addToast({
        type: 'warning',
        message: 'Workflow execution cancelled',
      }),
    );
  },
});

// ─── Catch any rejected thunks ───────────────────────────────────────────────

startAppListening({
  matcher: isRejected,
  effect: (action, listenerApi) => {
    // Skip the executeWorkflow thunk rejections — those are already
    // handled by executionFailed and executionCancelled above.
    if (action.type === 'execution/executeWorkflow/rejected') {
      return;
    }

    // Skip condition-aborted thunks (e.g. RTK Query cache deduplication,
    // or executeWorkflow's "already running" guard). These are normal
    // control flow, not real errors.
    const meta = (action as { meta?: { condition?: boolean } }).meta;
    if (meta?.condition) {
      return;
    }

    const errorMessage =
      (action as { error?: { message?: string } }).error?.message ??
      'An unexpected error occurred';

    listenerApi.dispatch(
      addToast({
        type: 'warning',
        message: `Action failed: ${errorMessage}`,
      }),
    );
  },
});
