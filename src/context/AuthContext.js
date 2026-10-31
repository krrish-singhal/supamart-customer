import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import apiClient from '../services/api';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { stopBackgroundTracking } from '../services/backgroundLocation';

export const AuthContext = createContext();

// Marker stored in React state (never sent anywhere as a literal bearer token) so
// CartContext/FavoritesContext's `if (token) ...` truthiness checks keep working
// unchanged for a Firebase-native session. api.js's request interceptor is what actually
// decides which real credential to send per-request — see AsyncStorage's 'authMode' key.
const FIREBASE_NATIVE_MARKER = 'firebase-native';

// Resolves once Firebase Auth's own persisted session (see services/firebase.js —
// initializeAuth with AsyncStorage persistence) has been restored, or resolves null if
// there wasn't one. auth.currentUser can be null for an instant on cold start even for a
// session that WILL restore, so this — not a synchronous currentUser check — is the
// correct way to wait for it.
function waitForFirebaseAuthRestore() {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser || null);
    }, 4000);
    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(timer);
      unsub();
      resolve(u);
    });
  });
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
      const authMode = await AsyncStorage.getItem('authMode');

      if (authMode === 'firebase') {
        // Optimistic restore: unblock the UI immediately if we have a cached profile,
        // exactly like legacy token mode does, so slow backend/failover never hangs startup.
        const storedProfile = await AsyncStorage.getItem('userProfile');
        let hasCachedProfile = false;
        if (storedProfile) {
          try {
            setUserProfile(JSON.parse(storedProfile));
            setToken(FIREBASE_NATIVE_MARKER);
            setLoading(false); // Unblock UI immediately
            hasCachedProfile = true;
          } catch (_e) {}
        }

        // Confirm the session in Firebase Auth's local persistence
        const fbUser = await waitForFirebaseAuthRestore();
        if (!fbUser) {
          // Firebase Auth confirms there is NO active local session (user signed out)
          setToken(null);
          setUserProfile(null);
          await AsyncStorage.removeItem('userProfile');
          await AsyncStorage.removeItem('authMode');
          setLoading(false);
          return;
        }

        // Session is valid in Firebase Auth
        setToken(FIREBASE_NATIVE_MARKER);

        // If we didn't have a cached profile, supply an optimistic profile and unblock UI
        if (!hasCachedProfile) {
          let detectedRole = 'CUSTOMER';
          try {
            const partnerSnap = await getDoc(doc(db, 'deliveryPartners', fbUser.uid));
            if (partnerSnap.exists()) {
              detectedRole = 'PARTNER';
            }
          } catch (_e) {}
          const optimistic = {
            id: fbUser.uid,
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            role: detectedRole,
          };
          setUserProfile(optimistic);
          setLoading(false);
        }

        // Verify/refresh profile from backend in background without blocking startup or timing out
        apiClient
          .get('/auth/me', { __skipErrorToast: true })
          .then((res) => {
            if (res.data) {
              setUserProfile(res.data);
              AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
            }
          })
          .catch((err) => {
            // ONLY invalidate session if the backend explicitly rejected authentication with 401
            if (err.response?.status === 401) {
              setToken(null);
              setUserProfile(null);
              AsyncStorage.removeItem('userToken');
              AsyncStorage.removeItem('userProfile');
              AsyncStorage.removeItem('authMode');
              firebaseSignOut(auth).catch(() => {});
            }
            // If offline, network error, or backend failover/cold-start:
            // KEEP the user logged in with their cached profile!
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      }

      const stored = await AsyncStorage.getItem('userToken');
      if (stored) {
        setToken(stored);
        
        // Try to load cached profile so we don't block UI while backend wakes up
        const storedProfile = await AsyncStorage.getItem('userProfile');
        if (storedProfile) {
          try {
            setUserProfile(JSON.parse(storedProfile));
            setLoading(false); // Unblock UI immediately
          } catch (_e) {}
        }
        
        // Verify in background
        apiClient.get('/auth/me', { __skipErrorToast: true })
          .then(res => {
            setUserProfile(res.data);
            AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
          })
          .catch(err => {
            if (err.response?.status === 401) {
              setToken(null);
              setUserProfile(null);
              AsyncStorage.removeItem('userToken');
              AsyncStorage.removeItem('userProfile');
              AsyncStorage.removeItem('authMode');
            }
          })
          .finally(() => {
            setLoading(false); // Make sure UI is unblocked if cached profile was missing
          });
        return;
      }
    } catch {
      setToken(null);
      setUserProfile(null);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      await AsyncStorage.removeItem('authMode');
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken, profile, { deferState = false } = {}) => {
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    await AsyncStorage.removeItem('authMode'); // this is the backend-JWT path — make sure the request interceptor uses it, not a stale Firebase marker
    if (!deferState) {
      setToken(newToken);
      setUserProfile(profile);
    }
  };

  const [needsAddressPrompt, setNeedsAddressPrompt] = useState(false);
  const [needsAddressSelection, setNeedsAddressSelection] = useState(false);

  const restoreAddressPreference = async (profile) => {
    setNeedsAddressSelection(false);
    if (profile.role === 'PARTNER') {
      setNeedsAddressPrompt(false);
      return;
    }
    try {
      const { data } = await apiClient.get(`/users/${profile.id}/addresses`, { __skipErrorToast: true });
      setNeedsAddressPrompt((data.items || []).length === 0);
    } catch {
      setNeedsAddressPrompt(false);
    }
  };

  const register = async ({ name, email, mobile, password }) => {
    const { data } = await apiClient.post('/auth/register', { name, email, mobile, password });
    const { token: newToken, ...profile } = data;
    await login(newToken, profile, { deferState: true });
    setNeedsAddressPrompt(true);
    setNeedsAddressSelection(false);
    setToken(newToken);
    setUserProfile(profile);
    return profile;
  };

  const signIn = async ({ email, password, mobile }) => {
    // Keep Firebase accounts (including delivery partners) working, but fetch
    // their profile through the API rather than opening a Firestore stream.
    if (email && password) {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await credential.user.getIdToken();
        let profile = null;
        try {
          const res = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${idToken}` },
            __skipErrorToast: true,
            timeout: 25000,
          });
          profile = res?.data || null;
        } catch (_err) {}

        if (!profile || profile.role !== 'PARTNER') {
          try {
            const partnerSnap = await getDoc(doc(db, 'deliveryPartners', credential.user.uid));
            if (partnerSnap.exists()) {
              const partnerData = partnerSnap.data();
              profile = {
                id: credential.user.uid,
                uid: credential.user.uid,
                name: partnerData.name || credential.user.displayName || 'Delivery Partner',
                email: partnerData.email || credential.user.email || '',
                mobile: partnerData.phone || partnerData.mobile || '',
                role: 'PARTNER',
                ...partnerData,
              };
            }
          } catch (_e) {}
        }
        if (profile) {
          await AsyncStorage.setItem('authMode', 'firebase');
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
          await restoreAddressPreference(profile);
          setToken(FIREBASE_NATIVE_MARKER);
          setUserProfile(profile);
          return profile;
        }
      } catch {
        // Existing backend accounts can still sign in when Firebase Auth is unavailable.
      }
    }
    // Backend login (supports email, mobile, and password)
    const { data } = await apiClient.post('/auth/login', { email, password, mobile });
    const { token: newToken, ...profile } = data;
    await login(newToken, profile, { deferState: true });
    await restoreAddressPreference(profile);
    setToken(newToken);
    setUserProfile(profile);
    return profile;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userProfile');
    await AsyncStorage.removeItem('authMode');
    setToken(null);
    setUserProfile(null);
    setNeedsAddressPrompt(false);
    setNeedsAddressSelection(false);
    try {
      await stopBackgroundTracking();
    } catch (_e) {}
    try {
      await firebaseSignOut(auth);
    } catch {
      // best-effort cleanup
    }
  };

  const deleteAccount = async (payload, { deferLogout = false } = {}) => {
    const body = typeof payload === 'string' ? { password: payload } : (payload || {});
    const { data } = await apiClient.delete('/users/me', {
      data: body,
      timeout: 60000,
    });
    if (!deferLogout) {
      await logout();
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userProfile,
        setToken,
        setUserProfile,
        login,
        register,
        signIn,
        logout,
        signOut: logout,
        deleteAccount,
        loading,
        loadToken,
        needsAddressPrompt,
        setNeedsAddressPrompt,
        needsAddressSelection,
        setNeedsAddressSelection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
