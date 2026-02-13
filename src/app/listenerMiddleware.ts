import {
  createListenerMiddleware,
  addListener,
  type TypedStartListening,
  type TypedAddListener,
} from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './store';

/**
 * The listener middleware instance for the application.
 *
 * Listeners can be registered here for side effects like auto-save,
 * theme application, execution orchestration, etc. The actual listener
 * registrations will be added in Phase 3F, but the infrastructure is
 * set up here.
 */
export const listenerMiddleware = createListenerMiddleware();

/**
 * Typed helper for registering listeners in feature modules.
 *
 * Usage:
 * ```ts
 * startAppListening({
 *   actionCreator: someAction,
 *   effect: async (action, listenerApi) => {
 *     // ...
 *   },
 * });
 * ```
 */
export type AppStartListening = TypedStartListening<RootState, AppDispatch>;

export const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

/**
 * Typed helper for dynamically adding listeners via dispatch.
 */
export type AppAddListener = TypedAddListener<RootState, AppDispatch>;

export const addAppListener = addListener as AppAddListener;
