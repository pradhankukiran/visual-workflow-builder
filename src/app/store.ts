import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import rootReducer from './rootReducer';
import { persistConfig } from './persistConfig';
import { listenerMiddleware } from './listenerMiddleware';
import { historyMiddleware } from '../features/history/historyMiddleware';
import { workflowLibraryApi } from '../features/workflowLibrary/workflowLibraryApi';

// ─── Persisted Reducer ───────────────────────────────────────────────────────

const persistedReducer = persistReducer(persistConfig, rootReducer);

// ─── Store ───────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist action types that include non-serializable values
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(listenerMiddleware.middleware)
      .concat(historyMiddleware)
      .concat(workflowLibraryApi.middleware),
  devTools: true,
});

// ─── Persistor ───────────────────────────────────────────────────────────────

export const persistor = persistStore(store);

// ─── Type Exports ────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
