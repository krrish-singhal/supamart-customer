import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc as nativeDoc, onSnapshot as nativeOnSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { doc as readsDoc, onSnapshot as readsOnSnapshot } from '../services/reads';
import apiClient from '../services/api';

const ASYNC_STORAGE_KEY = '@supamart_store_config';

const ConfigContext = createContext({ config: null, refreshConfig: async () => {} });

export function ConfigProvider({ children }) {
  // Default to open initially so app does not flash 'Closed' before first fetch completes
  const [config, setConfig] = useState(() => ({
    isStoreOpen: true,
    storeOpen: true,
    serviceRadiusKm: 5,
    minOrderValue: 0,
    deliveryMode: 'ON_DEMAND',
    receivedAt: Date.now(),
  }));

  const isMountedRef = useRef(true);

  const applyConfig = useCallback((newConfig) => {
    if (!newConfig || typeof newConfig !== 'object' || !isMountedRef.current) return;
    setConfig((prev) => {
      const merged = { ...(prev || {}), ...newConfig, receivedAt: Date.now() };
      AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/config', { __skipErrorToast: true });
      if (data) {
        applyConfig(data);
      }
      return data;
    } catch {
      return null;
    }
  }, [applyConfig]);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Immediately rehydrate the latest known config from AsyncStorage
    AsyncStorage.getItem(ASYNC_STORAGE_KEY)
      .then((raw) => {
        if (raw && isMountedRef.current) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              setConfig((prev) => ({ ...(prev || {}), ...parsed, receivedAt: Date.now() }));
            }
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Immediate fresh network fetch
    refreshConfig();

    // 3. High-frequency polling (every 3 seconds) for real-time dynamic sync with admin toggle
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshConfig();
      }
    }, 3000);

    // 4. AppState listener for instant refresh when returning from background
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshConfig();
      }
    });

    // 5. Proxy reads onSnapshot listener
    let unsubReads = null;
    try {
      unsubReads = readsOnSnapshot(
        readsDoc(null, 'config', 'global', { pollInterval: 3000 }),
        (snap) => {
          if (snap && snap.exists && snap.exists()) {
            applyConfig(snap.data());
          }
        },
        () => {}
      );
    } catch (_) {}

    // 6. Native Firestore onSnapshot listener
    let unsubNative = null;
    try {
      if (db) {
        unsubNative = nativeOnSnapshot(
          nativeDoc(db, 'config', 'global'),
          (snap) => {
            if (snap && snap.exists()) {
              applyConfig(snap.data());
            }
          },
          () => {}
        );
      }
    } catch (_) {}

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      sub.remove();
      if (unsubReads) unsubReads();
      if (unsubNative) unsubNative();
    };
  }, [refreshConfig, applyConfig]);

  return <ConfigContext.Provider value={{ config, refreshConfig }}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);


