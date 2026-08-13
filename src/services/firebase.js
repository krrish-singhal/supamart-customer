import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Real sign-in (email/password) is against our own backend (JWT), not Firebase Auth —
// see context/AuthContext.js. `auth` here is used only to bridge that backend session
// into a Firebase custom-token sign-in (AuthContext.syncFirebaseAuth), so the Firestore
// client SDK has a non-null request.auth for owner-restricted rules (e.g.
// users/{uid}/notifications) — without it, every direct onSnapshot read from this app
// would need a fully public rule, which is fine for products/categories/orders-by-id
// but not for a per-user notification inbox.
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// initializeAuth (with explicit AsyncStorage persistence) instead of plain getAuth() —
// without it, Firebase Auth warns on every launch and falls back to in-memory
// persistence, meaning the custom-token sign-in from syncFirebaseAuth wouldn't survive
// even a screen reload without redoing the round trip. initializeAuth throws if this
// module re-evaluates with an app that already has an Auth instance (e.g. Fast Refresh
// during development), so fall back to getAuth() in that case.
let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}
export { auth };
