import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const stored = await AsyncStorage.getItem('userToken');
      if (stored) {
        setToken(stored);
        const res = await apiClient.get('/auth/me');
        setUserProfile(res.data);
      }
    } catch {
      setToken(null);
      setUserProfile(null);
      await AsyncStorage.removeItem('userToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken, profile) => {
    await AsyncStorage.setItem('userToken', newToken);
    setToken(newToken);
    setUserProfile(profile);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    setToken(null);
    setUserProfile(null);
    try { await signOut(auth); } catch {}
  };

  return (
    <AuthContext.Provider value={{ token, userProfile, login, logout, loading, loadToken }}>
      {children}
    </AuthContext.Provider>
  );
}
