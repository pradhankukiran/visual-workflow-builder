import { combineReducers } from '@reduxjs/toolkit';
import workflowReducer from '../features/workflow/workflowSlice';
import executionReducer from '../features/execution/executionSlice';
import historyReducer from '../features/history/historySlice';
import uiReducer from '../features/ui/uiSlice';
import toastReducer from '../features/toast/toastSlice';
import validationReducer from '../features/validation/validationSlice';
import { workflowLibraryApi } from '../features/workflowLibrary/workflowLibraryApi';

/**
 * Root reducer combining all feature slice reducers.
 *
 * Cross-slice actions like `resetApp` are handled individually by each
 * slice in their `extraReducers` section, so no root-level wrapping
 * is needed.
 */
const rootReducer = combineReducers({
  workflow: workflowReducer,
  execution: executionReducer,
  history: historyReducer,
  ui: uiReducer,
  toast: toastReducer,
  validation: validationReducer,
  [workflowLibraryApi.reducerPath]: workflowLibraryApi.reducer,
});

export type RootReducerState = ReturnType<typeof rootReducer>;

export default rootReducer;
