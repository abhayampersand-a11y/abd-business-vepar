import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';
import { api } from './api';
import uiReducer from './uiSlice';

/**
 * redux-persist reaches for `window` at import time, which breaks server
 * rendering. This no-op storage stands in until the browser takes over.
 */
function createNoopStorage() {
  return {
    getItem: async () => null,
    setItem: async (_key: string, value: string) => value,
    removeItem: async () => {},
  };
}

const persistStorage = typeof window !== 'undefined' ? storage : createNoopStorage();

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Both the UI preferences *and* the RTK Query cache are persisted. Persisting
 * the cache is what stops a reload from re-fetching every list — the store
 * answers instantly from localStorage while a background refetch confirms.
 */
const persistedReducer = persistReducer<RootState>(
  {
    key: 'vyapar-root',
    version: 1,
    storage: persistStorage as never,
    whitelist: ['ui', api.reducerPath],
    throttle: 1000,
  },
  rootReducer,
);

export const makeStore = () =>
  configureStore({
    reducer: persistedReducer,
    middleware: (getDefault) =>
      getDefault({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(api.middleware),
    devTools: process.env.NODE_ENV !== 'production',
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

export const makePersistor = (store: AppStore) => persistStore(store);
export { createWebStorage };
