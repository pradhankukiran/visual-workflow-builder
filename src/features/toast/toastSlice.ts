import {
  createSlice,
  createEntityAdapter,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { DEFAULT_TOAST_DURATION } from '../../constants/defaults';
import { resetApp } from '../workflow/workflowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: string;
}

// ─── Entity Adapter ──────────────────────────────────────────────────────────

const toastAdapter = createEntityAdapter<Toast, string>({
  selectId: (toast) => toast.id,
  sortComparer: (a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const toastSlice = createSlice({
  name: 'toast',
  initialState: toastAdapter.getInitialState(),
  reducers: {
    /**
     * Add a new toast notification.
     * Uses a prepare callback to auto-generate the `id` and `createdAt`.
     */
    addToast: {
      reducer(state, action: PayloadAction<Toast>) {
        toastAdapter.addOne(state, action.payload);
      },
      prepare(payload: {
        type: ToastType;
        message: string;
        duration?: number;
      }) {
        return {
          payload: {
            id: nanoid(),
            type: payload.type,
            message: payload.message,
            duration: payload.duration ?? DEFAULT_TOAST_DURATION,
            createdAt: new Date().toISOString(),
          },
        };
      },
    },

    /** Remove a toast by ID (e.g., when dismissed or after timeout). */
    removeToast(state, action: PayloadAction<string>) {
      toastAdapter.removeOne(state, action.payload);
    },

    /** Clear all active toast notifications. */
    clearToasts(state) {
      toastAdapter.removeAll(state);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetApp, (state) => {
      toastAdapter.removeAll(state);
    });
  },
});

export const { addToast, removeToast, clearToasts } = toastSlice.actions;
export { toastAdapter };
export default toastSlice.reducer;
