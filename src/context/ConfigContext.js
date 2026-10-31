import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import apiClient from '../services/api';

const ConfigContext = createContext({ config: null, refreshConfig: async () => {} });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);

  const refreshConfig = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/config', { __skipErrorToast: true });
      setConfig((prev) => ({ ...(prev || {}), ...data, receivedAt: Date.now() }));
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshConfig();
    const timer = setInterval(refreshConfig, 60000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshConfig();
    });

    let unsubSnapshot = null;
    try {
      unsubSnapshot = onSnapshot(
        doc(db, 'config', 'global'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setConfig((prev) => ({
              ...(prev || {}),
              ...data,
              receivedAt: Date.now(),
            }));
          }
        },
        (err) => {
          console.warn('Config snapshot error, relying on REST:', err.message);
        }
      );
    } catch (e) {
      console.warn('Firestore snapshot setup error:', e.message);
    }

    return () => {
      clearInterval(timer);
      sub.remove();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [refreshConfig]);

  return <ConfigContext.Provider value={{ config, refreshConfig }}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);

