import storage from 'redux-persist/lib/storage';
import type { PersistConfig } from 'redux-persist';
import type { RootReducerState } from './rootReducer';

/**
 * redux-persist configuration for the visual workflow builder.
 *
 * Only the `workflow` and `ui` slices are persisted to localStorage.
 * Execution history and toast notifications are ephemeral.
 */
export const persistConfig: PersistConfig<RootReducerState> = {
  key: 'visual-workflow-builder',
  version: 1,
  storage,
  whitelist: ['workflow', 'ui'],
  // Optional migration function for future schema changes
  // migrate: createMigrate(migrations, { debug: false }),
};
