import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import apiClient, { setNetworkErrorListener } from '../services/api';

const NetworkContext = createContext({
  isOffline: false,
  setIsOffline: () => {},
  checkConnection: async () => false,
});

export function NetworkProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      // True offline is when device has no network connection at all
      if (state.isConnected === false) {
        setIsOffline(true);
        return false;
      }

      // Quick ping test to verify actual internet access (allowing normal failover to cloud backend)
      try {
        await apiClient.get('/health', { timeout: 6000, __skipErrorToast: true });
        setIsOffline(false);
        return true;
      } catch (err) {
        // Only if device has explicitly no internet and server responded with network error
        if (state.isInternetReachable === false && !err.response) {
          setIsOffline(true);
          return false;
        }
        // If device has network connection, don't falsely block UI with offline screen
        setIsOffline(false);
        return true;
      }
    } catch {
      setIsOffline(false);
      return true;
    }
  }, []);

  useEffect(() => {
    // 0. Listen to API transport errors — only declare offline if device is truly disconnected
    setNetworkErrorListener(async () => {
      try {
        const state = await NetInfo.fetch();
        if (state.isConnected === false) {
          setIsOffline(true);
        }
      } catch {
        // Ignore
      }
    });

    // 1. NetInfo subscription
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === false) {
        setIsOffline(true);
      } else if (state.isConnected === true && state.isInternetReachable !== false) {
        setIsOffline(false);
      }
    });

    // 2. Web offline/online event listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
      }

      return () => {
        unsubscribe();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOffline, setIsOffline, checkConnection }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
