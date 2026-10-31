import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertCircle, X } from './icons';
import {
  collection as readsCollection,
  query as readsQuery,
  where as readsWhere,
  onSnapshot as readsOnSnapshot,
} from '../services/reads';
import {
  collection as nativeCollection,
  query as nativeQuery,
  where as nativeWhere,
  onSnapshot as nativeOnSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';
import OrderRatings from './OrderRatings';
import { fonts } from '../theme/typography';

const ASYNC_STORAGE_HANDLED_KEY = '@supamart_handled_delivery_confirmations';

/**
 * Checks if an order already has its customer rating submitted.
 * Submitting the rating is the final closing step for an order.
 */
function isRatingSubmitted(data) {
  if (!data) return false;
  if (
    data.ratings &&
    (data.ratings.orderRating || data.ratings.ratedAt || Object.keys(data.ratings).length > 0)
  ) {
    return true;
  }
  if (data.deliveryRating != null && data.deliveryRating !== 0) {
    return true;
  }
  if (data.rating != null && data.rating !== 0) {
    return true;
  }
  return false;
}

export default function DeliveryConfirmationModal() {
  const { userProfile, token } = useContext(AuthContext) || {};
  const [pendingOrder, setPendingOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewState, setViewState] = useState('QUESTION'); // 'QUESTION' | 'RATING'

  const handledOrdersRef = useRef(new Set());
  const pendingOrderRef = useRef(null);

  useEffect(() => {
    pendingOrderRef.current = pendingOrder;
  }, [pendingOrder]);

  // Load persistently handled / dismissed / rated orders from AsyncStorage
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(ASYNC_STORAGE_HANDLED_KEY)
      .then((raw) => {
        if (!isMounted || !raw) return;
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((item) => handledOrdersRef.current.add(String(item)));
          }
        } catch (_) {}
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const markOrderHandled = async (orderId, orderNo) => {
    if (!orderId && !orderNo) return;
    if (orderId) handledOrdersRef.current.add(String(orderId));
    if (orderNo) handledOrdersRef.current.add(String(orderNo));

    try {
      const allHandled = Array.from(handledOrdersRef.current).slice(-150);
      await AsyncStorage.setItem(ASYNC_STORAGE_HANDLED_KEY, JSON.stringify(allHandled));
    } catch (_) {}
  };

  const isDeliveryPartner = userProfile?.role === 'PARTNER';
  const currentUserId = userProfile?.id || userProfile?.uid || auth.currentUser?.uid;
  const hasAuth = !!token || !!auth.currentUser;

  useEffect(() => {
    // Only non-partner customers with a valid active session should receive delivery confirmation prompts
    if (!hasAuth || isDeliveryPartner || !currentUserId) {
      setPendingOrder(null);
      return;
    }

    let isMounted = true;

    const checkAndSetOrder = (orderList) => {
      if (!isMounted || !Array.isArray(orderList)) return;

      // If an order is currently shown, dismiss it immediately if cancelled or rating was completed
      if (pendingOrderRef.current) {
        const curId = String(pendingOrderRef.current.id);
        const curNo = pendingOrderRef.current.orderNo ? String(pendingOrderRef.current.orderNo) : null;
        const match = orderList.find((item) => {
          const d = typeof item?.data === 'function' ? item.data() : item;
          const id = String(item?.id || d?.id || item?.orderNo || d?.orderNo || '');
          return id === curId || (curNo && id === curNo);
        });
        if (match) {
          const d = typeof match?.data === 'function' ? match.data() : match;
          const s = d?.status || match?.status;
          if (s === 'CANCELLED' || isRatingSubmitted(d)) {
            markOrderHandled(curId, curNo);
            setPendingOrder(null);
            return;
          }
        }
      }

      // Find an order awaiting confirmation that has NOT been handled and does NOT have rating submitted
      const found = orderList.find((item) => {
        const data = typeof item?.data === 'function' ? item.data() : item;
        const s = data?.status || item?.status;
        const id = String(item?.id || data?.id || '');
        const no = data?.orderNo || item?.orderNo ? String(data?.orderNo || item?.orderNo) : '';

        // 1. One order must come only once
        if ((id && handledOrdersRef.current.has(id)) || (no && handledOrdersRef.current.has(no))) {
          return false;
        }

        // 2. Only for orders where rating is NOT yet submitted
        if (isRatingSubmitted(data)) {
          if (id) handledOrdersRef.current.add(id);
          if (no) handledOrdersRef.current.add(no);
          return false;
        }

        // 3. Status must be PENDING_CONFIRMATION or unconfirmed recently DELIVERED
        if (s === 'PENDING_CONFIRMATION') return true;
        const isRecent = Date.now() - (data?.updatedAt || data?.createdAt || 0) < 2 * 60 * 60 * 1000;
        if (s === 'DELIVERED' && !data?.confirmedAt && isRecent) {
          return true;
        }
        return false;
      });

      if (found) {
        const resolved = {
          ...(typeof found?.data === 'function' ? found.data() : found),
          id: found.id || found.orderNo,
        };
        setPendingOrder((prev) => {
          if (prev?.id === resolved.id && prev?.status === resolved.status) return prev;
          return resolved;
        });
        setViewState((curr) => (curr === 'RATING' ? curr : 'QUESTION'));
      }
    };

    // 1. Direct high-frequency check via backend API (zero cache staleness)
    const checkViaApi = async () => {
      if (!isMounted) return;
      try {
        const { data } = await apiClient.get('/orders/pending-confirmation', { __skipErrorToast: true });
        if (isMounted && data?.order) {
          checkAndSetOrder([data.order]);
          return;
        }
      } catch (_) {}

      try {
        const { data } = await apiClient.get('/orders/mine?limit=5', { __skipErrorToast: true });
        if (isMounted && data?.items) {
          checkAndSetOrder(data.items);
        }
      } catch (_) {}
    };

    checkViaApi();
    const intervalTimer = setInterval(checkViaApi, 2500);

    // 2. Real-time listener via reads proxy service
    let unsubReads = null;
    try {
      const q = readsQuery(
        readsCollection(null, 'orders', { pollInterval: 3000 }),
        readsWhere('userId', '==', currentUserId)
      );
      unsubReads = readsOnSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          const docs = snap.docs ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
          checkAndSetOrder(docs);
        },
        () => {}
      );
    } catch (_) {}

    // 3. Native Firestore listener if Firebase Auth session is active
    let unsubNative = null;
    if (auth.currentUser) {
      try {
        const nq = nativeQuery(
          nativeCollection(db, 'orders'),
          nativeWhere('userId', '==', currentUserId)
        );
        unsubNative = nativeOnSnapshot(
          nq,
          (snap) => {
            if (!isMounted) return;
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            checkAndSetOrder(docs);
          },
          () => {}
        );
      } catch (_) {}
    }

    // 4. Recheck whenever app comes to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkViaApi();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
      if (unsubReads) unsubReads();
      if (unsubNative) unsubNative();
      appStateSub.remove();
    };
  }, [hasAuth, currentUserId, isDeliveryPartner]);

  const handleDismiss = () => {
    if (pendingOrder) {
      markOrderHandled(pendingOrder.id, pendingOrder.orderNo);
    }
    setPendingOrder(null);
  };

  const handleConfirm = async () => {
    if (!pendingOrder || submitting) return;
    setSubmitting(true);
    const orderToConfirm = pendingOrder;
    try {
      const targetId = orderToConfirm.id || orderToConfirm.orderNo;
      // Confirm delivery without pre-submitting rating so user rates on the next step
      const { data: confirmedOrder } = await apiClient.patch(`/orders/${targetId}/confirm-delivery`, {});
      setRatingOrder({ ...orderToConfirm, ...(confirmedOrder || {}), status: 'DELIVERED' });
      setPendingOrder(null);
      Toast.show({ type: 'success', text1: 'Delivery confirmed!' });
      setViewState('RATING');
    } catch (error) {
      console.warn('Error confirming delivery:', error?.response?.data || error.message);
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.error || 'Could not confirm delivery. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!pendingOrder || submitting) return;
    setSubmitting(true);
    const orderToDispute = pendingOrder;
    const targetId = orderToDispute.id || orderToDispute.orderNo;
    try {
      await markOrderHandled(orderToDispute.id, orderToDispute.orderNo);
      await apiClient.patch(`/orders/${targetId}/dispute-delivery`);
      setPendingOrder(null);
      Toast.show({ type: 'info', text1: 'Dispute submitted. Our team will contact you shortly.' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: error?.response?.data?.error || 'Failed to submit dispute' });
    } finally {
      setSubmitting(false);
    }
  };

  const displayedOrder = viewState === 'RATING' ? ratingOrder : pendingOrder;
  if (!displayedOrder) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {viewState === 'QUESTION' ? (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              accessibilityLabel="Close confirmation modal"
            >
              <X size={18} color="#64748b" strokeWidth={2.4} />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <AlertCircle size={38} color="#d97706" strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>Order Collected?</Text>
            <Text style={styles.subtitle}>
              Your delivery partner has marked Order #{displayedOrder.orderNo || String(displayedOrder.id).slice(-4)} as delivered. Did you receive it?
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleDispute}
                disabled={submitting}
                style={[styles.button, styles.btnDispute]}
                activeOpacity={0.8}
              >
                <Text style={styles.btnDisputeText}>No, I did not</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={submitting}
                style={[styles.button, styles.btnConfirm]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnConfirmText}>
                  {submitting ? 'Confirming...' : 'Yes, I got it'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.ratingCardContainer}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.ratingScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              <OrderRatings
                order={displayedOrder}
                onDismiss={() => {
                  if (displayedOrder) {
                    markOrderHandled(displayedOrder.id, displayedOrder.orderNo);
                  }
                  setRatingOrder(null);
                  setPendingOrder(null);
                  setViewState('QUESTION');
                }}
                inModal
              />
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fffbeb',
    borderWidth: 2,
    borderColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDispute: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  btnDisputeText: {
    fontFamily: fonts.bold,
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  btnConfirm: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnConfirmText: {
    fontFamily: fonts.bold,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  ratingCardContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 12,
  },
  ratingScrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
});
