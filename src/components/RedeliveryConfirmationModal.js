import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  AppState,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Package,
  Clock,
  CheckCircle,
  X,
  ChevronLeft,
  AlertTriangle,
  RotateCcw,
} from './icons';
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
import { Image } from 'expo-image';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';
import { getDynamicScheduleDays, MASTER_STORE_SLOTS } from '../utils/redeliverySchedule';

const DECLINE_REASONS = [
  'I no longer need the item',
  'I prefer a refund instead',
  'Will be out of town / unavailable',
  'Already bought an alternative',
  'Other reason',
];

export default function RedeliveryConfirmationModal() {
  const { userProfile, token } = useContext(AuthContext) || {};
  const [pendingOrder, setPendingOrder] = useState(null);
  const [viewState, setViewState] = useState('AVAILABILITY'); // 'AVAILABILITY' | 'RESCHEDULE' | 'DECLINE'
  const [submitting, setSubmitting] = useState(false);

  // Dynamic schedule days and realistic slots
  const scheduleDays = useMemo(() => getDynamicScheduleDays(), [pendingOrder]);
  const [selectedDayId, setSelectedDayId] = useState(scheduleDays[0]?.id || 'Tomorrow');
  const [selectedSlot, setSelectedSlot] = useState(scheduleDays[0]?.slots?.[0] || '9:00 AM – 11:00 AM');

  useEffect(() => {
    if (scheduleDays.length > 0) {
      const activeDay = scheduleDays.find((d) => d.id === selectedDayId) || scheduleDays[0];
      setSelectedDayId(activeDay.id);
      if (!activeDay.slots.includes(selectedSlot)) {
        setSelectedSlot(activeDay.slots[0] || '9:00 AM – 11:00 AM');
      }
    }
  }, [scheduleDays]);

  const activeDayObj = useMemo(() => {
    return scheduleDays.find((d) => d.id === selectedDayId) || scheduleDays[0];
  }, [scheduleDays, selectedDayId]);

  // Decline state
  const [selectedReason, setSelectedReason] = useState(DECLINE_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  // Squelch dismissed orders temporarily in current session if user presses X
  const dismissedInSessionRef = useRef(new Map()); // orderId -> timestamp

  const isDeliveryPartner = userProfile?.role === 'PARTNER';
  const currentUserId = userProfile?.id || userProfile?.uid || auth.currentUser?.uid;
  const hasAuth = !!token || !!auth.currentUser;

  useEffect(() => {
    if (!hasAuth || isDeliveryPartner || !currentUserId) {
      setPendingOrder(null);
      return;
    }

    let isMounted = true;

    const checkAndSetPending = (orderList) => {
      if (!isMounted || !Array.isArray(orderList)) return;

      const found = orderList.find((item) => {
        const data = typeof item?.data === 'function' ? item.data() : item;
        const id = String(item?.id || data?.id || '');
        const isRedelivery = data?.isRedelivery === true;
        const redeliveryStatus = data?.redeliveryStatus;
        const status = data?.status;

        if (!isRedelivery) return false;
        if (status === 'CANCELLED') return false;
        if (redeliveryStatus !== 'AWAITING_CUSTOMER_CONFIRMATION') return false;

        // If dismissed within the last 30 minutes in this app session, do not auto-repop
        const dismissedAt = dismissedInSessionRef.current.get(id);
        const reminderSentAt = data?.reminderSentAt || data?.updatedAt || 0;
        if (dismissedAt && reminderSentAt <= dismissedAt) {
          return false;
        }

        return true;
      });

      if (found) {
        const resolved = {
          ...(typeof found?.data === 'function' ? found.data() : found),
          id: found.id || found.orderNo,
        };
        setPendingOrder(resolved);
      } else {
        setPendingOrder(null);
      }
    };

    // 1. Direct high-frequency check via backend API
    const checkViaApi = async () => {
      if (!isMounted) return;
      try {
        const { data } = await apiClient.get('/orders/pending-redelivery', { __skipErrorToast: true });
        if (isMounted && data?.order) {
          checkAndSetPending([data.order]);
          return;
        }
      } catch (_) {}

      try {
        const { data } = await apiClient.get('/orders/mine?limit=5', { __skipErrorToast: true });
        if (isMounted && data?.items) {
          checkAndSetPending(data.items);
        }
      } catch (_) {}
    };

    checkViaApi();
    const intervalTimer = setInterval(checkViaApi, 3500);

    // 2. Real-time listener via reads proxy service
    let unsubReads = null;
    try {
      const q = readsQuery(
        readsCollection(null, 'orders', { pollInterval: 4000 }),
        readsWhere('userId', '==', currentUserId)
      );
      unsubReads = readsOnSnapshot(
        q,
        (snap) => {
          if (!isMounted) return;
          const docs = snap.docs ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
          checkAndSetPending(docs);
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
            checkAndSetPending(docs);
          },
          () => {}
        );
      } catch (_) {}
    }

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
  }, [hasAuth, isDeliveryPartner, currentUserId]);

  const handleDismiss = () => {
    if (pendingOrder?.id) {
      dismissedInSessionRef.current.set(String(pendingOrder.id), Date.now());
    }
    setPendingOrder(null);
    setViewState('AVAILABILITY');
  };

  // 1. Confirm: Yes, I am available now
  const handleConfirmAvailability = async () => {
    if (!pendingOrder?.id || submitting) return;
    setSubmitting(true);
    try {
      await apiClient.patch(`/orders/${pendingOrder.id}/redelivery/respond`, {
        action: 'CONFIRM',
      });
      Toast.show({
        type: 'success',
        text1: 'Replacement Confirmed!',
        text2: 'Our team is preparing and dispatching your items now.',
      });
      handleDismiss();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to confirm',
        text2: err.response?.data?.error || err.message || 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Reschedule: No, select another date & time slot
  const handleConfirmReschedule = async () => {
    if (!pendingOrder?.id || submitting) return;
    setSubmitting(true);
    const combinedSlot = `${activeDayObj?.id || selectedDayId}, ${selectedSlot}`;
    try {
      await apiClient.patch(`/orders/${pendingOrder.id}/redelivery/respond`, {
        action: 'RESCHEDULE',
        slot: combinedSlot,
      });
      Toast.show({
        type: 'success',
        text1: 'Delivery Rescheduled',
        text2: `Scheduled for ${combinedSlot}. We will dispatch accordingly.`,
      });
      handleDismiss();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to reschedule',
        text2: err.response?.data?.error || err.message || 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Decline replacement
  const handleConfirmDecline = async () => {
    if (!pendingOrder?.id || submitting) return;
    setSubmitting(true);
    const finalReason = selectedReason === 'Other reason' && customReason.trim()
      ? customReason.trim()
      : selectedReason;

    try {
      await apiClient.patch(`/orders/${pendingOrder.id}/redelivery/respond`, {
        action: 'DECLINE',
        reason: finalReason,
      });
      Toast.show({
        type: 'info',
        text1: 'Replacement Request Closed',
        text2: 'You have declined this delivery. Our team will follow up for support.',
      });
      handleDismiss();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to decline',
        text2: err.response?.data?.error || err.message || 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingOrder) return null;

  const items = pendingOrder.items || [];
  const originalOrderNo = pendingOrder.originalOrderNo || 'Original';

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            {viewState !== 'AVAILABILITY' ? (
              <TouchableOpacity
                onPress={() => setViewState('AVAILABILITY')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.backBtn}
              >
                <ChevronLeft size={20} color="#0f172a" strokeWidth={2.4} />
              </TouchableOpacity>
            ) : (
              <View style={styles.badgeIconWrap}>
                <RotateCcw size={18} color="#059669" strokeWidth={2.5} />
              </View>
            )}

            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={styles.headerTitle}>
                {viewState === 'AVAILABILITY'
                  ? 'Free Replacement Order'
                  : viewState === 'RESCHEDULE'
                  ? 'Select Reschedule Time'
                  : 'Decline Replacement'}
              </Text>
              <Text style={styles.headerSub}>
                Order #{pendingOrder.orderNo} · Original #{originalOrderNo}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <X size={18} color="#64748b" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* VIEW 1: AVAILABILITY QUESTION */}
            {viewState === 'AVAILABILITY' && (
              <>
                {/* Explanation Banner */}
                <View style={styles.infoBanner}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Package size={17} color="#047857" style={{ marginRight: 6 }} />
                    <Text style={styles.infoBannerTitle}>
                      100% Free Replacement Arranged
                    </Text>
                  </View>
                  <Text style={styles.infoBannerBody}>
                    We apologize for the issue with order #{originalOrderNo}. We have arranged a replacement package for you. <Text style={{ fontWeight: '800' }}>You will not be charged anything.</Text>
                  </Text>
                </View>

                {/* Items Being Delivered */}
                <Text style={styles.sectionTitle}>
                  Replacement Items ({items.length})
                </Text>

                <View style={styles.itemsBox}>
                  {items.map((item, idx) => {
                    const imgSource =
                      getProductImageSource(item, 100) ||
                      (item?.image ? { uri: optimizeCloudinaryUrl(item.image, 100) } : null);
                    return (
                      <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
                        <View style={styles.itemImgWrap}>
                          {imgSource ? (
                            <Image
                              source={imgSource}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="contain"
                            />
                          ) : (
                            <Package size={20} color="#94a3b8" />
                          )}
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemMeta}>
                            Qty: {item.qty} {item.variantLabel ? `· ${item.variantLabel}` : ''}
                          </Text>
                        </View>
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeBadgeText}>FREE</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Question Prompt */}
                <View style={styles.questionCard}>
                  <Clock size={20} color="#047857" style={{ marginRight: 10, marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questionTitle}>
                      Are you available to receive this delivery now?
                    </Text>
                    <Text style={styles.questionSubtitle}>
                      Our delivery partner is ready to bring your replacement shortly.
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={{ gap: 10, marginTop: 18 }}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                    onPress={handleConfirmAvailability}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>
                          Yes, I'm available (Dispatch Now)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => setViewState('RESCHEDULE')}
                    disabled={submitting}
                  >
                    <Clock size={16} color="#334155" style={{ marginRight: 6 }} />
                    <Text style={styles.secondaryBtnText}>
                      No, select another date & time slot
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.declineLink}
                    onPress={() => setViewState('DECLINE')}
                    disabled={submitting}
                  >
                    <Text style={styles.declineLinkText}>
                      Decline this replacement
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* VIEW 2: RESCHEDULE SLOT SELECTION */}
            {viewState === 'RESCHEDULE' && (
              <>
                <Text style={styles.sectionTitle}>Select Available Date</Text>
                <View style={styles.chipsRow}>
                  {scheduleDays.map((day) => {
                    const isSelected = selectedDayId === day.id;
                    return (
                      <TouchableOpacity
                        key={day.id}
                        onPress={() => {
                          setSelectedDayId(day.id);
                          if (!day.slots.includes(selectedSlot)) {
                            setSelectedSlot(day.slots[0] || '9:00 AM – 11:00 AM');
                          }
                        }}
                        style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                      >
                        <Text style={[styles.dayChipTitle, isSelected && styles.dayChipTitleSelected]}>
                          {day.dayLabel}
                        </Text>
                        <Text style={[styles.dayChipSubtitle, isSelected && styles.dayChipSubtitleSelected]}>
                          {day.dateLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                  Select Time Slot ({activeDayObj?.slots?.length || 0} available)
                </Text>
                <View style={styles.slotsGrid}>
                  {(activeDayObj?.slots || []).map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        onPress={() => setSelectedSlot(slot)}
                        style={[styles.slotCard, isSelected && styles.slotCardSelected]}
                      >
                        <Clock
                          size={14}
                          color={isSelected ? '#059669' : '#64748b'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.rescheduleNotice}>
                  <Text style={styles.rescheduleNoticeText}>
                    We will keep your request active and update our admin team. Your replacement will remain completely free.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 18 }, submitting && styles.btnDisabled]}
                  onPress={handleConfirmReschedule}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      Confirm Rescheduled Time
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* VIEW 3: DECLINE REPLACEMENT */}
            {viewState === 'DECLINE' && (
              <>
                <View style={styles.warningBanner}>
                  <AlertTriangle size={18} color="#b91c1c" style={{ marginRight: 8, marginTop: 1 }} />
                  <Text style={styles.warningBannerText}>
                    Are you sure you want to decline? Our support team will be notified to review alternative solutions or refund options.
                  </Text>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
                  Reason for declining
                </Text>

                <View style={{ gap: 8, marginTop: 8 }}>
                  {DECLINE_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        onPress={() => setSelectedReason(reason)}
                        style={[styles.radioRow, isSelected && styles.radioRowSelected]}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.radioText, isSelected && styles.radioTextSelected]}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedReason === 'Other reason' && (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Please specify reason..."
                    placeholderTextColor="#94a3b8"
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    numberOfLines={3}
                  />
                )}

                <TouchableOpacity
                  style={[styles.destructiveBtn, { marginTop: 20 }, submitting && styles.btnDisabled]}
                  onPress={handleConfirmDecline}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.destructiveBtnText}>
                      Confirm Decline
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  infoBanner: {
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16,
  },
  infoBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#065f46',
  },
  infoBannerBody: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#047857',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  itemsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderColor: '#edf2f7',
  },
  itemImgWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  itemName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemMeta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  freeBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  freeBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    marginBottom: 4,
  },
  questionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  questionSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#475569',
    marginTop: 3,
    lineHeight: 17,
  },
  primaryBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.extraBold,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  declineLink: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineLinkText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayChipSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  dayChipTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  dayChipTitleSelected: {
    color: '#059669',
    fontWeight: '800',
  },
  dayChipSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  dayChipSubtitleSelected: {
    color: '#047857',
  },
  slotsGrid: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  slotCardSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  slotText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  slotTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
  rescheduleNotice: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 14,
  },
  rescheduleNoticeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 10,
  },
  warningBannerText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: '#991b1b',
    lineHeight: 18,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  radioRowSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: '#ef4444',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  radioText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#334155',
  },
  radioTextSelected: {
    fontFamily: fonts.bold,
    color: '#991b1b',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    marginTop: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  destructiveBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtnText: {
    fontFamily: fonts.extraBold,
    fontSize: 14.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
