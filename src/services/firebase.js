import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Sign-in supports backend JWT and Firebase Auth sessions. Mobile data reads
// live in services/reads.js and use the backend's ownership checks.
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let db;
try {
  // Use long-polling in React Native to prevent WebChannel RPC Listen stream transport drops
  db = initializeFirestore(app, {
    ...(Platform.OS !== 'web' && {
      experimentalForceLongPolling: true,
      // Close hanging GETs before proxies with a 30-second idle timeout do.
      experimentalLongPollingOptions: { timeoutSeconds: 25 },
    }),
  });
} catch (error) {
  if (error.code !== 'failed-precondition') throw error;
  db = getFirestore(app);
}
export { db };

// initializeAuth (with explicit AsyncStorage persistence) instead of plain getAuth() —
// without it, Firebase Auth warns on every launch and falls back to in-memory
// persistence. initializeAuth throws if this
// module re-evaluates with an app that already has an Auth instance (e.g. Fast Refresh
// during development), so fall back to getAuth() in that case.
let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}
export { auth };
