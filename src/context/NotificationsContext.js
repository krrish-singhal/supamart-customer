import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Toast from 'react-native-toast-message';
import { db, auth } from '../config/firebase';
import apiClient from '../services/api';

export const NotificationsContext = createContext();

// Mirrors OrderTrackingScreen's onSnapshot pattern: users/{uid}/notifications is written
// by the backend (notificationService.notifyUser, see backend/src/services/notificationService.js)
// whenever an admin approves/rejects a payment or an order's status changes. A live
// listener here means the bell badge and an in-app toast update instantly — anywhere in
// the app, not just on the tracking screen — the moment that write happens, no
// polling/refresh needed.
//
// This is keyed off Firebase Auth's own onAuthStateChanged, NOT AuthContext's
// userProfile. users/{uid}/notifications is owner-restricted in firestore.rules
// (allow read: if isOwner(uid)), which needs request.auth.uid to actually be set —
// and that only happens once AuthContext's syncFirebaseAuth() finishes
// signInWithCustomToken, which resolves *after* userProfile is already set. Firestore
// onSnapshot listeners don't retry on permission-denied, so starting the listener off
// userProfile would race: it'd fire once, fail before auth was ready, and never recover
// even after sign-in completed a moment later. onAuthStateChanged only fires once
// Firebase Auth itself is actually ready, so the listener is never started too early.
export function NotificationsProvider({ children }) {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  const [notifications, setNotifications] = useState([]);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      setUid(fbUser?.uid || null);
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return undefined;
    }
    mountedAtRef.current = Date.now();
    let isFirstSnapshot = true;

    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Skip the initial load (Firestore reports every existing doc as "added" on
        // first snapshot) — only toast for notifications that arrive live, after mount.
        if (!isFirstSnapshot) {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const data = change.doc.data();
            if (data.createdAt < mountedAtRef.current) return;
            Toast.show({
              type: data.data?.type === 'PAYMENT_REJECTED' ? 'error' : 'success',
              text1: data.title,
              text2: data.body,
            });
          });
        }
        isFirstSnapshot = false;
      },
      (err) => { console.error('NotificationsContext: listener failed', err); }
    );
    return () => unsubscribe();
  }, [uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Firestore rules deny ALL client writes to users/{uid}/notifications outright
  // (`allow write: if false` — see backend/firebase/firestore.rules; only the backend's
  // Admin SDK can write there). A direct writeBatch() from here would fail permission-
  // denied on every single call — silently, if wrapped in a try/catch — which is exactly
  // why the bell badge never used to clear. This goes through the backend instead; the
  // resulting Firestore write still comes back through the onSnapshot listener above,
  // same as any other real-time update.
  const markAllRead = useCallback(async () => {
    if (!uid) return;
    if (!notifications.some((n) => !n.read)) return;
    try {
      await apiClient.patch('/notifications/mark-all-read');
    } catch (err) {
      console.error('markAllRead failed', err);
    }
  }, [uid, notifications]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
