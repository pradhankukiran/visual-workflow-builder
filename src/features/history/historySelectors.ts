import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

const selectHistoryState = (state: RootState) => state.history;

/** Whether there are past states available for undo. */
export const selectCanUndo = createSelector(
  selectHistoryState,
  (history) => history.past.length > 0,
);

/** Whether there are future states available for redo. */
export const selectCanRedo = createSelector(
  selectHistoryState,
  (history) => history.future.length > 0,
);

/** Total number of entries in the undo stack. */
export const selectHistoryLength = createSelector(
  selectHistoryState,
  (history) => history.past.length,
);

/** Select the most recent past snapshot (top of the undo stack). */
export const selectLastSnapshot = createSelector(
  selectHistoryState,
  (history) =>
    history.past.length > 0
      ? history.past[history.past.length - 1]
      : undefined,
);

/** Select the most recent future snapshot (top of the redo stack). */
export const selectNextSnapshot = createSelector(
  selectHistoryState,
  (history) =>
    history.future.length > 0
      ? history.future[history.future.length - 1]
      : undefined,
);
