'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import type { Persistor } from 'redux-persist';
import { makeStore, makePersistor } from './index';

export function Providers({ children }: { children: ReactNode }) {
  // A lazy initialiser builds the store exactly once, without touching a ref
  // during render.
  const [store] = useState(makeStore);
  const [persistor, setPersistor] = useState<Persistor | null>(null);

  // The persistor must be created *after* hydration: PersistGate renders null
  // until rehydration finishes, which would not match the server-rendered HTML
  // if it existed on the first client render. So this setState-in-effect is
  // deliberate, not an oversight.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersistor(makePersistor(store));
  }, [store]);

  return (
    <Provider store={store}>
      {persistor ? (
        <PersistGate loading={null} persistor={persistor}>
          {children}
        </PersistGate>
      ) : (
        children
      )}
    </Provider>
  );
}
