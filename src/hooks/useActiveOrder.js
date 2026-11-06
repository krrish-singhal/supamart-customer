import { useEffect, useState } from 'react';
import apiClient from '../services/api';
import { db } from '../config/firebase';
import { doc, onSnapshot } from '../services/reads';
import { FINAL_STATUSES, ACTIVE_ORDER_STATUSES, orderEstimate } from '../utils/orderEstimate';
// Deliveries complete within 15-30 minutes. Orders older than 3 hours are stale.
const MAX_ACTIVE_ORDER_AGE_MS = 3 * 60 * 60 * 1000;

export default function useActiveOrder(userId, focused) {
  const [order, setOrder] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Keep the Home header countdown moving between Firestore snapshots.
  useEffect(() => {
    if (!focused || !order) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [focused, Boolean(order)]);

  // 1. Initial load & background sync via API
  useEffect(() => {
    setOrder(null);
    if (!userId || !focused) return;
    let active = true;
    let timer = null;
    const load = async () => {
      try {
        const { data } = await apiClient.get('/orders/mine?limit=5', { __skipErrorToast: true });
        if (active) {
          const currentTime = Date.now();
          const activeItem = (data.items || []).find(item => {
            if (!ACTIVE_ORDER_STATUSES.includes(item.status)) return false;
            if (FINAL_STATUSES.includes(item.status)) return false;
            const orderTime = typeof item.createdAt === 'number'
              ? item.createdAt
              : item.createdAt
              ? new Date(item.createdAt).getTime()
              : 0;
            if (orderTime && currentTime - orderTime > MAX_ACTIVE_ORDER_AGE_MS) return false;
            return true;
          });
          setOrder(activeItem || null);
          setNow(Date.now());
          return Boolean(activeItem);
        }
      } catch { /* Keep the last known order during a transient network failure. */ }
      return false;
    };

    const scheduleNext = (hasActive) => {
      if (!active) return;
      const delay = hasActive ? 4_000 : 12_000;
      timer = setTimeout(async () => {
        const activeFound = await load();
        scheduleNext(activeFound);
      }, delay);
    };

    load().then((hasActive) => {
      scheduleNext(hasActive);
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [userId, focused]);

  // 2. Real-time Firestore onSnapshot listener for instant updates from Admin Portal
  useEffect(() => {
    if (!order?.id || order.id === 'undefined') return;
    if (FINAL_STATUSES.includes(order.status)) return;

    const orderDocRef = doc(db, 'orders', order.id);
    const unsub = onSnapshot(
      orderDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          if (FINAL_STATUSES.includes(data.status)) {
            setOrder(null);
          } else {
            setOrder((prev) => (prev ? { ...prev, ...data } : data));
          }
          setNow(Date.now());
        }
      },
      () => {}
    );
    return () => unsub();
  }, [order?.id]);

  return { activeOrder: order, estimate: orderEstimate(order, now, order?.partnerLocation) };
}
