import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithCustomToken,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import apiClient from '../services/api';
import { auth, db } from '../services/firebase';

export const AuthContext = createContext();

// Bridges our backend-JWT session into a Firebase Auth session, purely so the Firestore
// client SDK has a non-null request.auth for owner-restricted rules (e.g.
// users/{uid}/notifications) — see backend/src/routes/auth.routes.js's /firebase-token
// and backend/firebase/firestore.rules. Best-effort: if this fails, the rest of the app
// (backend API calls, public-read Firestore listeners) still works fine — only
// owner-restricted direct reads like the notification bell would silently stay empty.
// Only used by the backend-JWT (fallback) path below — the Firebase-native fast path is
// already a real Firebase Auth session and doesn't need this bridge at all.
async function syncFirebaseAuth() {
  try {
    const { data } = await apiClient.get('/auth/firebase-token', { __skipErrorToast: true });
    await signInWithCustomToken(auth, data.token);
  } catch (err) {
    console.error('syncFirebaseAuth failed', err);
  }
}

// Marker stored in React state (never sent anywhere as a literal bearer token) so
// CartContext/FavoritesContext's `if (token) ...` truthiness checks keep working
// unchanged for a Firebase-native session. api.js's request interceptor is what actually
// decides which real credential to send per-request — see AsyncStorage's 'authMode' key.
const FIREBASE_NATIVE_MARKER = 'firebase-native';

// Same sanitization discipline as the backend's publicUser() (backend/src/utils/
// publicUser.js) — a password hash and reset-token internals must never reach the client,
// even when it's the account owner reading their own Firestore doc directly.
function sanitizeProfile(id, data) {
  const { passwordHash, resetPasswordTokenHash, resetPasswordExpires, ...rest } = data;
  return { id, ...rest };
}

// Resolves once Firebase Auth's own persisted session (see services/firebase.js —
// initializeAuth with AsyncStorage persistence) has been restored, or resolves null if
// there wasn't one. auth.currentUser can be null for an instant on cold start even for a
// session that WILL restore, so this — not a synchronous currentUser check — is the
// correct way to wait for it.
function waitForFirebaseAuthRestore() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

// Hard ceiling on the whole boot-time fast-path restore (local Firebase Auth restore +
// one Firestore profile read). Both steps are normally fast — the auth restore is a local
// AsyncStorage read with no network involved, and Firestore typically answers in well
// under a second — but NEITHER step had any bound before this, so if either was ever slow
// or simply never resolved, the app sat on the loading spinner forever and the login
// screen never appeared at all. This guarantees that can never happen again: on timeout,
// it falls back to a clean logged-out state (same as "no session found") so the user sees
// the login screen and can just sign in again, rather than an indefinite spinner.
const FAST_PATH_RESTORE_TIMEOUT_MS = 4000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve('__timeout__'), ms)),
  ]);
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
        // Fast path restore: read straight from Firebase Auth's own local persistence +
        // Firestore, no backend call at all — instant regardless of whether the Render
        // backend happens to be cold-starting right now. Bounded by
        // FAST_PATH_RESTORE_TIMEOUT_MS so this can never hang the app on the loading
        // spinner indefinitely (see that constant's comment for why this exists).
        const result = await withTimeout(
          (async () => {
            const fbUser = await waitForFirebaseAuthRestore();
            if (!fbUser) return null;
            let snap = await getDoc(doc(db, 'users', fbUser.uid));
            if (snap.exists()) return sanitizeProfile(snap.id, snap.data());
            snap = await getDoc(doc(db, 'deliveryPartners', fbUser.uid));
            if (snap.exists()) return { id: snap.id, ...snap.data(), role: 'PARTNER' };
            return null;
          })(),
          FAST_PATH_RESTORE_TIMEOUT_MS
        );

        if (result === '__timeout__') {
          console.error(`Firebase session restore timed out after ${FAST_PATH_RESTORE_TIMEOUT_MS}ms — showing login instead of hanging.`);
        } else if (result) {
          setToken(FIREBASE_NATIVE_MARKER);
          setUserProfile(result);
          return;
        }
        // No session, no profile, or a timeout — clear the stale flag rather than getting
        // stuck on it next launch too; falls through to "no session" (shows login).
        await AsyncStorage.removeItem('authMode');
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
          } catch(e) {}
        }
        
        // Verify in background
        apiClient.get('/auth/me', { __skipErrorToast: true })
          .then(res => {
            setUserProfile(res.data);
            AsyncStorage.setItem('userProfile', JSON.stringify(res.data));
            syncFirebaseAuth();
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

  const login = async (newToken, profile) => {
    await AsyncStorage.setItem('userToken', newToken);
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    await AsyncStorage.removeItem('authMode'); // this is the backend-JWT path — make sure the request interceptor uses it, not a stale Firebase marker
    setToken(newToken);
    setUserProfile(profile);
    syncFirebaseAuth();
  };

  // Registers a new account and signs the user in. Throws on failure (e.g. email
  // already registered) — the api.js interceptor already toasts the error message.
  // Uses the global 120s timeout so a cold-starting backend returns the real reply
  // (e.g. "Incorrect password") instead of failing the first attempt with a network error.
  //
  // Left going through the backend as before — registration is a one-time event per
  // account, not the repeated-every-app-open cost that made login worth fast-pathing.
  // The backend now also mirrors the new account into Firebase Auth in the background
  // (see backend/src/routes/auth.routes.js), so this same account's NEXT sign-in already
  // gets the fast path below.
  const register = async ({ name, email, mobile, password }) => {
    const { data } = await apiClient.post('/auth/register', { name, email, mobile, password });
    const { token: newToken, ...profile } = data;
    await login(newToken, profile);
    return profile;
  };

  // Fast path first: sign in directly against Firebase Auth — a globally-distributed,
  // always-on service with no cold-start dependency on our Render backend, unlike the
  // fallback endpoint below. Every account gets mirrored into Firebase Auth on
  // registration or the first time it logs in via the fallback (see backend/src/routes/
  // auth.routes.js mirrorToFirebaseAuth()), so this succeeds for the large majority of
  // real logins; anything not yet mirrored — or a genuinely wrong password on top of a
  // migrated account — falls through to the exact original flow, unchanged.
  const signIn = async ({ email, password }) => {
    try {
      // Bounded the same way as the boot-time restore above — a stalled network call here
      // must fall back to the original login instead of leaving the Sign In button stuck.
      const result = await withTimeout(
        (async () => {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          let snap = await getDoc(doc(db, 'users', cred.user.uid));
          if (snap.exists()) return sanitizeProfile(snap.id, snap.data());
          snap = await getDoc(doc(db, 'deliveryPartners', cred.user.uid));
          if (snap.exists()) return { id: snap.id, ...snap.data(), role: 'PARTNER' };
          return null;
        })(),
        FAST_PATH_RESTORE_TIMEOUT_MS
      );

      if (result === '__timeout__') {
        console.error(`Firebase sign-in timed out after ${FAST_PATH_RESTORE_TIMEOUT_MS}ms — falling back to backend login.`);
      } else if (result) {
        await AsyncStorage.setItem('authMode', 'firebase');
        await AsyncStorage.removeItem('userToken');
        setToken(FIREBASE_NATIVE_MARKER);
        setUserProfile(result);
        return result;
      } else {
        // Signed in but no matching Firestore profile — shouldn't happen in practice, but
        // don't leave the user stuck on it; fall through to the backend path below.
        console.error('Firebase sign-in succeeded but no matching Firestore profile was found; falling back.');
      }
    } catch (err) {
      // Expected, not an error, for any account not yet mirrored into Firebase Auth —
      // this one login uses the original path, which mirrors it for next time.
      if (!['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password'].includes(err.code)) {
        console.error('Firebase sign-in failed unexpectedly, falling back to backend login:', err);
      }
    }

    // Fallback: the original backend-verified login — entirely unchanged.
    const { data } = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, ...profile } = data;
    await login(newToken, profile);
    return profile;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userProfile');
    await AsyncStorage.removeItem('authMode');
    setToken(null);
    setUserProfile(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      // best-effort — nothing to clean up if there was never a Firebase session
    }
  };

  return (
    <AuthContext.Provider value={{ token, userProfile, setToken, setUserProfile, login, register, signIn, logout, loading, loadToken }}>
      {children}
    </AuthContext.Provider>
  );
}
