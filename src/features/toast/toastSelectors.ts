import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { toastAdapter, type Toast } from './toastSlice';

// ─── Adapter Selectors ───────────────────────────────────────────────────────

const selectToastState = (state: RootState) => state.toast;

const adapterSelectors = toastAdapter.getSelectors(selectToastState);

/** Select all toasts. */
export const selectAllToasts = adapterSelectors.selectAll;

/** Select a toast by ID. */
export const selectToastById = adapterSelectors.selectById;

/** Select the total number of active toasts. */
export const selectToastCount = adapterSelectors.selectTotal;

// ─── Derived Selectors ───────────────────────────────────────────────────────

/**
 * Select active toasts sorted by creation time (oldest first).
 * This is the primary selector used by the toast UI container.
 */
export const selectActiveToasts = createSelector(
  selectAllToasts,
  (toasts): Toast[] =>
    [...toasts].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
);
