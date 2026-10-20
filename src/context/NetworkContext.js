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
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);

      if (!connected) {
        setIsOffline(true);
        return false;
      }

      // Quick ping test to verify actual internet access
      try {
        await apiClient.get('/health', { timeout: 3500, __skipErrorToast: true });
        setIsOffline(false);
        return true;
      } catch (err) {
        // If server ping fails with network error, consider offline
        if (!err.response && (err.code === 'ECONNABORTED' || err.message?.includes('Network Error'))) {
          setIsOffline(true);
          return false;
        }
        // If server returned 404 or other response, device IS connected to internet
        setIsOffline(false);
        return true;
      }
    } catch {
      setIsOffline(true);
      return false;
    }
  }, []);

  useEffect(() => {
    // 0. Listen to API transport errors
    setNetworkErrorListener(() => {
      setIsOffline(true);
    });

    // 1. NetInfo subscription
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(!online);
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
