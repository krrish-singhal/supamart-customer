import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from '../services/reads';
import Toast from 'react-native-toast-message';
import { db } from '../config/firebase';
import { AuthContext } from './AuthContext';
import apiClient from '../services/api';
import { setupSystemNotifications, postSystemNotification } from '../services/notifications';

export const NotificationsContext = createContext();

// Inbox reads use the backend session and refresh while the app is visible.
export function NotificationsProvider({ children }) {
  const { token, userProfile } = useContext(AuthContext);
  const uid = token ? userProfile?.id : null;
  const [notifications, setNotifications] = useState([]);
  const [activeDelayAlert, setActiveDelayAlert] = useState(null);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    setupSystemNotifications();
  }, []);

  const dismissDelayAlert = useCallback(() => {
    setActiveDelayAlert(null);
  }, []);

  const isPartner = userProfile?.role === 'PARTNER';

  useEffect(() => {
    if (!uid || isPartner) {
      setNotifications([]);
      setActiveDelayAlert(null);
      return undefined;
    }
    mountedAtRef.current = Date.now();
    let isFirstSnapshot = true;

    const q = query(
      collection(db, 'users', uid, 'notifications', { pollInterval: 5000 }),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Skip the initial load (Firestore reports every existing doc as "added" on
        // first snapshot) — only toast and alert for notifications that arrive live, after mount.
        if (!isFirstSnapshot) {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const data = change.doc.data();
            if (data.createdAt < mountedAtRef.current) return;

            const isDelay =
              data.data?.type === 'DELIVERY_DELAY' ||
              data.title?.toLowerCase().includes('delay') ||
              data.body?.toLowerCase().includes('delay') ||
              Boolean(data.data?.delayReason);

            if (isDelay) {
              setActiveDelayAlert({
                id: change.doc.id,
                title: data.title,
                body: data.body,
                data: data.data || {},
              });
            }

            // Post into phone system notification drawer (like WhatsApp)
            postSystemNotification({
              title: data.title,
              body: data.body,
              data: data.data || {},
            });

            Toast.show({
              type: data.data?.type === 'PAYMENT_REJECTED'
                ? 'error'
                : isDelay
                ? 'warning'
                : 'success',
              text1: data.title,
              text2: data.body,
            });
          });
        }
        isFirstSnapshot = false;
      },
      (err) => {
        console.warn('NotificationsContext: listener paused', err?.message || err);
      }
    );
    return () => unsubscribe();
  }, [uid, isPartner]);

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
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAllRead, activeDelayAlert, dismissDelayAlert }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
