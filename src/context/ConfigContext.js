import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import apiClient from '../services/api';
const ConfigContext = createContext({ config: null, refreshConfig: async () => {} });
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const refreshConfig = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/config', { __skipErrorToast: true });
      setConfig({ ...data, receivedAt: Date.now() });
      return data;
    } catch { return null; }
  }, []);
  useEffect(() => {
    refreshConfig();
    const timer = setInterval(refreshConfig, 60000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') refreshConfig(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refreshConfig]);
  return <ConfigContext.Provider value={{ config, refreshConfig }}>{children}</ConfigContext.Provider>;
}
export const useConfig = () => useContext(ConfigContext);
