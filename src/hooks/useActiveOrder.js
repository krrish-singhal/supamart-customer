import { useEffect, useState } from 'react';
import apiClient from '../services/api';
import { FINAL_STATUSES, orderEstimate } from '../utils/orderEstimate';
// Deliveries complete within 15-30 minutes. Orders older than 3 hours are stale.
const MAX_ACTIVE_ORDER_AGE_MS = 3 * 60 * 60 * 1000;

export default function useActiveOrder(userId, focused) {
  const [order, setOrder] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setOrder(null);
    if (!userId || !focused) return;
    let active = true;
    const load = async () => {
      try {
        const { data } = await apiClient.get('/orders/mine', { __skipErrorToast: true });
        if (active) {
          const currentTime = Date.now();
          const activeItem = (data.items || []).find(item => {
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
        }
      } catch { /* Keep the last known order during a transient network failure. */ }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [userId, focused]);
  return { activeOrder: order, estimate: orderEstimate(order, now) };
}
