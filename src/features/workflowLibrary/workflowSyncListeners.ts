import { isAnyOf } from '@reduxjs/toolkit';
import { startAppListening } from '@/app/listenerMiddleware';
import { workflowLibraryApi } from './workflowLibraryApi';

const CHANNEL_NAME = 'vwb-workflow-sync';

/**
 * Broadcast outgoing save/delete events to other tabs.
 */
startAppListening({
  matcher: isAnyOf(
    workflowLibraryApi.endpoints.saveWorkflow.matchFulfilled,
    workflowLibraryApi.endpoints.deleteWorkflow.matchFulfilled,
  ),
  effect: () => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'sync', timestamp: Date.now() });
    channel.close();
  },
});

/**
 * Listen for incoming sync events from other tabs.
 *
 * Uses `fork` to spawn a long-running BroadcastChannel listener,
 * and `condition` to keep the parent effect alive for the fork's lifetime.
 *
 * Demonstrates:
 *  - `listenerApi.unsubscribe()` — one-shot setup pattern
 *  - `listenerApi.fork()` — concurrent background tasks
 *  - `forkApi.signal` — cleanup on cancellation
 *  - `listenerApi.condition(() => false)` — keep parent alive indefinitely
 *  - `workflowLibraryApi.util.invalidateTags` — programmatic cache invalidation
 */
startAppListening({
  predicate: () => true, // Fires on the very first dispatched action
  effect: async (_action, listenerApi) => {
    // Only set up once — unsubscribe so this doesn't re-fire
    listenerApi.unsubscribe();

    // Fork a long-running task for BroadcastChannel listening
    listenerApi.fork(async (forkApi) => {
      const channel = new BroadcastChannel(CHANNEL_NAME);

      const handleMessage = () => {
        listenerApi.dispatch(
          workflowLibraryApi.util.invalidateTags(['WorkflowList']),
        );
      };

      channel.addEventListener('message', handleMessage);

      // Clean up when the fork is cancelled (app teardown)
      forkApi.signal.addEventListener('abort', () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
      });

      // Keep the fork alive indefinitely
      await forkApi.pause(new Promise(() => {}));
    });

    // Keep the parent effect alive so the fork isn't cancelled
    // (forked tasks are "attached" and cancelled when parent completes)
    await listenerApi.condition(() => false);
  },
});
