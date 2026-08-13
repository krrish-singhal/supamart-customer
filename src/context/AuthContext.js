import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import apiClient from '../services/api';
import { auth } from '../services/firebase';

export const AuthContext = createContext();

// Bridges our backend-JWT session into a Firebase Auth session, purely so the Firestore
// client SDK has a non-null request.auth for owner-restricted rules (e.g.
// users/{uid}/notifications) — see backend/src/routes/auth.routes.js's /firebase-token
// and backend/firebase/firestore.rules. Best-effort: if this fails, the rest of the app
// (backend API calls, public-read Firestore listeners) still works fine — only
// owner-restricted direct reads like the notification bell would silently stay empty.
async function syncFirebaseAuth() {
  try {
    const { data } = await apiClient.get('/auth/firebase-token');
    await signInWithCustomToken(auth, data.token);
  } catch (err) {
    console.error('syncFirebaseAuth failed', err);
  }
}

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
        syncFirebaseAuth();
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
    syncFirebaseAuth();
  };

  // Registers a new account and signs the user in. Throws on failure (e.g. email
  // already registered) — the api.js interceptor already toasts the error message.
  const register = async ({ name, email, mobile, password }) => {
    const { data } = await apiClient.post('/auth/register', { name, email, mobile, password });
    const { token: newToken, ...profile } = data;
    await login(newToken, profile);
    return profile;
  };

  const signIn = async ({ email, password }) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, ...profile } = data;
    await login(newToken, profile);
    return profile;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    setToken(null);
    setUserProfile(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      // best-effort — nothing to clean up if there was never a Firebase session
    }
  };

  return (
    <AuthContext.Provider value={{ token, userProfile, login, register, signIn, logout, loading, loadToken }}>
      {children}
    </AuthContext.Provider>
  );
}
