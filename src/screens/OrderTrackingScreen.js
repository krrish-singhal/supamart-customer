import { orderEstimate } from '../utils/orderEstimate';
import { STORE_LOCATION, validCoordinates } from '../config/deliveryArea';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Pressable,
  Linking,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { doc, onSnapshot } from '../services/reads';
import KeylessMap from '../components/maps/KeylessMap';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Check,
  X,
  RefreshCw,
  MapPin,
  Clock,
  DoorClosed,
} from '../components/icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { db } from '../config/firebase';
import { Skeleton } from '../components/ui';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';

export default function OrderTrackingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const { loadCart } = useCart();
  const [order, setOrder] = useState(null);
  const [partnerDoc, setPartnerDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repeating, setRepeating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [mapError, setMapError] = useState(false);

  const mapRef = useRef(null);
  const [estimateNow, setEstimateNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setEstimateNow(Date.now()), 15000); return () => clearInterval(timer); }, []);

  // 2. Real-time Firestore listener for the Order document (3.5s refresh)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId, { pollInterval: 3500 }),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOrder((prev) => (prev ? { ...prev, ...data } : { id: snap.id, ...data }));
          setLoading(false);
        }
      },
      (err) => {
        console.warn('OrderTrackingScreen orders listener error:', err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [orderId]);

  // 3. Real-time Firestore listener for the Assigned Delivery Partner document
  useEffect(() => {
    const partnerId = order?.assignedPartnerId || order?.deliveryBoyId || order?.deliveryPartner?.id;
    if (!partnerId) {
      setPartnerDoc(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'deliveryPartners', String(partnerId), { pollInterval: 4000 }),
      (snap) => {
        if (snap.exists()) {
          setPartnerDoc({ id: snap.id, ...snap.data() });
        }
      },
      (err) => {
        console.warn('Delivery partner listener error:', err.message);
      }
    );
    return unsubscribe;
  }, [order?.assignedPartnerId, order?.deliveryBoyId, order?.deliveryPartner?.id]);

  // 4. Polling backup (every 3.5 seconds) ensuring instant real-time sync when delivery boy updates time/delay
  useEffect(() => {
    if (order?.status === 'DELIVERED' || order?.status === 'CANCELLED') return;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/orders/${orderId}`);
        const fresh = res.data?.order || res.data;
        if (fresh?.id || fresh?.orderNo) {
          setOrder((prev) => {
            if (!prev) return fresh;

            const delayChanged =
              prev.delayReason !== fresh.delayReason ||
              prev.delayReportedAt !== fresh.delayReportedAt ||
              prev.estimatedDeliveryAt !== fresh.estimatedDeliveryAt ||
              JSON.stringify(prev.deliveryDelay) !== JSON.stringify(fresh.deliveryDelay);

            const statusChanged =
              prev.status !== fresh.status ||
              prev.assignedPartnerId !== fresh.assignedPartnerId ||
              prev.deliveryBoyName !== fresh.deliveryBoyName ||
              prev.deliveryBoyPhone !== fresh.deliveryBoyPhone ||
              prev.paymentStatus !== fresh.paymentStatus ||
              prev.updatedAt !== fresh.updatedAt ||
              JSON.stringify(prev.partnerLocation) !== JSON.stringify(fresh.partnerLocation);

            if (delayChanged || statusChanged) {
              return { ...prev, ...fresh };
            }
            return prev;
          });
        }
      } catch (_) {}
    }, 3500);
    return () => clearInterval(interval);
  }, [orderId, order?.status]);

  /**
   * Handle Back navigation cleanly to avoid the 2-screen loop:
   * If opened from Orders page, go back to Orders.
   * If opened from OrderConfirmation or direct checkout flow, RESET to Home screen!
   */
  const goHome = React.useCallback(() => {
    if (route.params?.fromOrders || route.params?.fromOrderDetail) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Orders');
      }
      return;
    }
    // Clean reset to Main -> Home so the customer can use all app features freely
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            routes: [{ name: 'Home' }],
            index: 0,
          },
        },
      ],
    });
  }, [navigation, route.params]);

  useEffect(() => {
    const onBackPress = () => {
      goHome();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [goHome]);

  // Coordinates resolution with stable primitives
  const storeLat = STORE_LOCATION.lat;
  const storeLng = STORE_LOCATION.lng;
  const storeCoord = useMemo(() => ({
    latitude: storeLat,
    longitude: storeLng,
  }), [storeLat, storeLng]);

  const addr = order?.addressSnapshot || order?.address;
  const rawDestLat = addr?.lat ?? addr?.latitude;
  const rawDestLng = addr?.lng ?? addr?.longitude;
  const hasValidDest = validCoordinates(rawDestLat, rawDestLng);
  const destLat = hasValidDest ? rawDestLat : storeLat;
  const destLng = hasValidDest ? rawDestLng : storeLng;

  const destCoord = useMemo(() => ({
    latitude: destLat,
    longitude: destLng,
  }), [destLat, destLng]);

  const pLoc = order?.partnerLocation;
  const docLoc = partnerDoc?.location;
  const partnerLat = Number(pLoc?.lat || docLoc?.lat);
  const partnerLng = Number(pLoc?.lng || docLoc?.lng);
  const hasPartnerCoords = !isNaN(partnerLat) && !isNaN(partnerLng) && partnerLat !== 0 && partnerLng !== 0;

  // Order has an assigned delivery partner only if an admin assigned one or partner data is attached
  const assignedPartnerId =
    order?.assignedPartnerId ||
    order?.deliveryBoyId ||
    order?.deliveryPartner?.id ||
    partnerDoc?.id ||
    null;

  const isPartnerAssigned = Boolean(
    (assignedPartnerId && String(assignedPartnerId).trim() !== '') ||
    (order?.deliveryBoyName && order.deliveryBoyName.trim() !== '') ||
    (order?.deliveryPartner?.name && order.deliveryPartner.name.trim() !== '')
  );

  const riderCoord = useMemo(() => {
    if (!isPartnerAssigned) return null;
    if (hasPartnerCoords) {
      return { latitude: partnerLat, longitude: partnerLng };
    }
    return null;
  }, [isPartnerAssigned, hasPartnerCoords, partnerLat, partnerLng]);

  // Dynamic route coordinates connecting Store -> (Rider if assigned) -> Destination
  const routePoints = useMemo(() => {
    if (isPartnerAssigned && riderCoord) {
      return [storeCoord, riderCoord, destCoord];
    }
    return [storeCoord, destCoord];
  }, [isPartnerAssigned, storeCoord, riderCoord, destCoord]);

  // Auto-fit map viewport to coordinates initially, avoiding repeated camera animation jitter
  const hasInitialFitRef = useRef(false);
  const lastFittedRiderRef = useRef(null);

  useEffect(() => {
    if (mapError || !mapRef.current || routePoints.length < 2) return;

    if (!hasInitialFitRef.current) {
      hasInitialFitRef.current = true;
      lastFittedRiderRef.current = isPartnerAssigned && riderCoord ? riderCoord : null;
      try {
        mapRef.current.fitToCoordinates(routePoints, {
          edgePadding: { top: 70, right: 60, bottom: 60, left: 60 },
          animated: false,
        });
      } catch (_) {}
      return;
    }

    // Only re-fit if rider has moved significantly (more than ~100m)
    if (isPartnerAssigned && riderCoord) {
      const prev = lastFittedRiderRef.current;
      if (prev) {
        const moved =
          Math.abs(prev.latitude - riderCoord.latitude) > 0.001 ||
          Math.abs(prev.longitude - riderCoord.longitude) > 0.001;
        if (moved) {
          lastFittedRiderRef.current = riderCoord;
          try {
            mapRef.current.fitToCoordinates(routePoints, {
              edgePadding: { top: 70, right: 60, bottom: 60, left: 60 },
              animated: true,
            });
          } catch (_) {}
        }
      } else {
        lastFittedRiderRef.current = riderCoord;
        try {
          mapRef.current.fitToCoordinates(routePoints, {
            edgePadding: { top: 70, right: 60, bottom: 60, left: 60 },
            animated: true,
          });
        } catch (_) {}
      }
    }
  }, [routePoints, riderCoord, isPartnerAssigned, mapError]);

  // Delivery partner details - ONLY populated when assigned by admin
  const partnerName = isPartnerAssigned
    ? (order?.deliveryBoyName ||
       order?.deliveryPartner?.name ||
       partnerDoc?.name ||
       'Delivery Partner')
    : null;

  const partnerPhone = isPartnerAssigned
    ? (order?.deliveryBoyPhone ||
       order?.deliveryPartner?.phone ||
       order?.deliveryPartner?.mobile ||
       partnerDoc?.phone ||
       partnerDoc?.mobile ||
       null)
    : null;

  const partnerInitials = partnerName
    ? partnerName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'DP'
    : 'DP';

  const handleCallPartner = () => {
    if (!isPartnerAssigned || !partnerPhone) {
      Toast.show({
        type: 'info',
        text1: 'Partner not assigned',
        text2: 'Delivery partner details will be available once assigned.',
      });
      return;
    }
    Linking.openURL(`tel:${partnerPhone}`).catch(() => {
      Toast.show({ type: 'info', text1: 'Partner phone', text2: partnerPhone });
    });
  };

  const handleEditDeliveryInstructions = () => {
    navigation.navigate('DeliveryInstructions', {
      returnScreen: 'OrderTracking',
      orderId: order?.id,
      address: order?.addressSnapshot || order?.address,
      initialInstructions: order?.deliveryInstructions,
    });
  };

  useEffect(() => {
    if (route.params?.updatedDeliveryInstructions) {
      const savedData = route.params.updatedDeliveryInstructions;
      setOrder((prev) => (prev ? { ...prev, deliveryInstructions: savedData } : prev));
    }
  }, [route.params?.updatedDeliveryInstructions]);

  const deliveryInstructionsText = useMemo(() => {
    if (!order?.deliveryInstructions) return null;
    if (typeof order.deliveryInstructions === 'string') return order.deliveryInstructions;
    if (order.deliveryInstructions.combinedNote) return order.deliveryInstructions.combinedNote;
    if (order.deliveryInstructions.summary) return order.deliveryInstructions.summary;
    if (
      Array.isArray(order.deliveryInstructions.selectedLabels) &&
      order.deliveryInstructions.selectedLabels.length > 0
    ) {
      return order.deliveryInstructions.selectedLabels.join(' · ');
    }
    return null;
  }, [order?.deliveryInstructions]);

  const handleRepeatOrder = async () => {
    if (!order?.items?.length) return;
    setRepeating(true);
    try {
      const items = order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
      }));

      await apiClient.put('/cart', { items });
      await loadCart(true, { force: true });

      Toast.show({ type: 'success', text1: 'Items added to cart.' });
      setShowDetailsModal(false);
      navigation.navigate('Cart');
    } catch {
      Toast.show({ type: 'error', text1: 'Could not repeat order.' });
    } finally {
      setRepeating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <View style={{ height: 280, backgroundColor: '#f1f5f9' }} />
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton width={180} height={32} borderRadius={8} />
          <Skeleton width="100%" height={220} borderRadius={20} />
          <Skeleton width="100%" height={80} borderRadius={20} />
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = order?.status === 'CANCELLED';
  const isDelivered = order?.status === 'DELIVERED';
  const isOutForDelivery = order?.status === 'OUT_FOR_DELIVERY';
  const isPacked =
    order?.status === 'PACKED' ||
    order?.status === 'ORDER_ACCEPTED' ||
    isOutForDelivery ||
    isDelivered;

  // Real-time dynamic ETA calculation using distance
  const etaMinutes = isDelivered ? 'Delivered' : isCancelled ? 'Cancelled' : orderEstimate(order, estimateNow) || 'Confirm delivery';

  const displayEstimatedTime = (() => {
    if (isDelivered) return 'Delivered';
    if (isCancelled) return 'Cancelled';
    if (order?.deliveryDelay?.newEstimatedTime) {
      const timeStr = String(order.deliveryDelay.newEstimatedTime).trim();
      return timeStr.startsWith('+') ? timeStr.slice(1) : timeStr;
    }
    return etaMinutes;
  })();

  const itemCount = order?.items?.length || 0;
  const orderTotal = Math.round(order?.total || order?.totalAmount || 0);



  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* TOP REAL-TIME MAP matching Image 1 */}
      <View style={{ height: 300, width: '100%', backgroundColor: '#edf2ed', position: 'relative' }}>
        <KeylessMap ref={mapRef} initialCenter={hasValidDest ? destCoord : storeCoord} selected={hasValidDest ? destCoord : null} rider={isPartnerAssigned ? riderCoord : null} route={hasValidDest ? routePoints : []} onReady={() => { setMapError(false); mapRef.current?.fitToCoordinates(routePoints); }} onTileState={ready => setMapError(!ready)} onError={() => setMapError(true)} />
        <Text style={{ position: 'absolute', bottom: 22, left: 12, color: '#386047', backgroundColor: '#ffffffe6', fontSize: 10, padding: 4, borderRadius: 6 }}>Straight-line location guide</Text>
        {mapError && <Pressable onPress={() => { setMapError(false); mapRef.current?.retry(); }} style={{ position: 'absolute', left: 60, right: 12, top: insets.top + 12, padding: 10, backgroundColor: '#fff3ee', borderRadius: 12 }}><Text style={{ fontSize: 12, color: '#9b2924' }}>Map unavailable · Tap to retry</Text></Pressable>}


        {/* Floating circular back button matching Image 1 */}
        <Pressable
          onPress={goHome}
          hitSlop={10}
          style={{
            position: 'absolute',
            top: Math.max(insets.top, 14),
            left: 18,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.14,
            shadowRadius: 6,
            elevation: 5,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            zIndex: 10,
          }}
        >
          <ChevronLeft size={22} color="#0f172a" strokeWidth={2.6} />
        </Pressable>
      </View>

      {/* BOTTOM FLOATING SHEET CARD matching Image 1 */}
      <View
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          marginTop: -28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 8,
          paddingHorizontal: 22,
          paddingTop: 24,
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
        >
          {/* Header Row: Arriving in X mins + ON TIME badge matching Image 1 */}
          <Animated.View entering={FadeInDown.duration(350)}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View>
                {!isDelivered && !isCancelled && (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 2 }}>
                    {order?.delayReason ? 'Updated ETA' : 'Arriving in'}
                  </Text>
                )}
                <Text style={{ fontSize: 30, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>
                  {displayEstimatedTime}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: isCancelled
                    ? '#fee2e2'
                    : isDelivered
                    ? '#ecfdf5'
                    : order?.delayReason
                    ? '#fef3c7'
                    : '#ecfdf5',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isCancelled
                      ? '#dc2626'
                      : isDelivered
                      ? '#059669'
                      : order?.delayReason
                      ? '#b45309'
                      : '#059669',
                    letterSpacing: 0.4,
                  }}
                >
                  {isCancelled
                    ? 'CANCELLED'
                    : isDelivered
                    ? 'COMPLETED'
                    : order?.delayReason
                    ? 'DELAYED'
                    : 'ON TIME'}
                </Text>
              </View>
            </View>

            {/* Delay Alert Banner */}
            {order?.delayReason && !isDelivered && !isCancelled && (
              <View
                style={{
                  backgroundColor: '#fffbeb',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#fde68a',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Clock size={15} color="#b45309" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400e' }}>
                    Delivery Delay Reported
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, color: '#78350f', lineHeight: 18 }}>
                  Reason: <Text style={{ fontWeight: '700' }}>{order.delayReason}</Text>
                </Text>
                {order?.deliveryDelay?.newEstimatedTime ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 4 }}>
                    Expected Delivery: {order.deliveryDelay.newEstimatedTime}
                  </Text>
                ) : null}
              </View>
            )}
          </Animated.View>

          {/* 4-Step Vertical Tracker Timeline matching Image 1 */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <View style={{ marginBottom: 24 }}>
              {/* Step 1: Order confirmed */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', marginRight: 16 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: '#059669',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={15} color="#ffffff" strokeWidth={3} />
                  </View>
                  <View
                    style={{
                      width: 2.5,
                      height: 32,
                      backgroundColor: isPacked ? '#059669' : '#e2e8f0',
                      marginVertical: 3,
                    }}
                  />
                </View>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                    Order confirmed
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                    We have received your order
                  </Text>
                </View>
              </View>

              {/* Step 2: Packed */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', marginRight: 16 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: isPacked ? '#059669' : '#ffffff',
                      borderWidth: isPacked ? 0 : 2,
                      borderColor: '#cbd5e1',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isPacked && <Check size={15} color="#ffffff" strokeWidth={3} />}
                  </View>
                  <View
                    style={{
                      width: 2.5,
                      height: 32,
                      backgroundColor: isOutForDelivery || isDelivered ? '#059669' : '#e2e8f0',
                      marginVertical: 3,
                    }}
                  />
                </View>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isPacked ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    Packed
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                    Your items are packed at the store
                  </Text>
                </View>
              </View>

              {/* Step 3: Out for delivery */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', marginRight: 16 }}>
                  {isDelivered ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: '#059669',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={15} color="#ffffff" strokeWidth={3} />
                    </View>
                  ) : isOutForDelivery ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        borderWidth: 3,
                        borderColor: '#059669',
                        backgroundColor: '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        borderWidth: 2,
                        borderColor: '#cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  )}
                  <View
                    style={{
                      width: 2.5,
                      height: 32,
                      backgroundColor: isDelivered ? '#059669' : '#e2e8f0',
                      marginVertical: 3,
                    }}
                  />
                </View>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isOutForDelivery || isDelivered ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    Out for delivery
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                    {isDelivered
                      ? 'Delivered to your address'
                      : isOutForDelivery
                      ? 'Your delivery partner is on the way'
                      : isPartnerAssigned
                      ? `Assigned to ${partnerName}`
                      : 'Delivery partner will be assigned soon'}
                  </Text>
                </View>
              </View>

              {/* Step 4: Delivered */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', marginRight: 16 }}>
                  {isDelivered ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: '#059669',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={15} color="#ffffff" strokeWidth={3} />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        borderWidth: 2,
                        borderColor: '#cbd5e1',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: isDelivered ? '#0f172a' : '#94a3b8',
                    }}
                  >
                    Delivered
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                    Enjoy your groceries
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Delivery Partner Card */}
          <Animated.View entering={FadeInUp.duration(400).delay(150)}>
            {isPartnerAssigned ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                {/* Partner initials circle */}
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: '#d1fae5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#065f46' }}>
                    {partnerInitials}
                  </Text>
                </View>

                {/* Partner Name & Subtitle */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#0f172a' }}>
                    {partnerName}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                    Your delivery partner
                  </Text>
                </View>

                {/* Call Partner Button - Only when real phone number exists */}
                {partnerPhone ? (
                  <Pressable
                    onPress={handleCallPartner}
                    hitSlop={8}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 1.5,
                      borderColor: '#059669',
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Phone size={18} color="#059669" strokeWidth={2.4} />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                {/* Unassigned initials circle matching Image 2 */}
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: '#d1fae5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#065f46' }}>
                    DP
                  </Text>
                </View>

                {/* Partner Name & Subtitle matching Image 2 */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#94a3b8' }}>
                    Delivery Partner
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                    Assigning partner shortly...
                  </Text>
                </View>

                {/* Disabled Call Button matching Image 2 position */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    borderWidth: 1.5,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.6,
                  }}
                >
                  <Phone size={18} color="#94a3b8" strokeWidth={2.4} />
                </View>
              </View>
            )}
          </Animated.View>

          {/* Delivery Instructions Card */}
          <Animated.View entering={FadeInUp.duration(350).delay(180)}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: '#eaf6ee',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <DoorClosed size={16} color="#087f46" strokeWidth={2.4} />
                  </View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                    Delivery instructions
                  </Text>
                </View>

                <Pressable
                  onPress={handleEditDeliveryInstructions}
                  hitSlop={8}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: '#f1f5f9',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#087f46' }}>
                    {deliveryInstructionsText ? 'Edit' : 'Add'}
                  </Text>
                </Pressable>
              </View>

              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: '500',
                  color: deliveryInstructionsText ? '#334155' : '#64748b',
                  lineHeight: 18,
                }}
              >
                {deliveryInstructionsText ||
                  'Add instructions for your delivery partner (e.g. leave at door, don’t ring bell)'}
              </Text>
            </View>
          </Animated.View>

          {/* Order Items Preview Card matching Image 1 */}
          <Animated.View entering={FadeInUp.duration(400).delay(220)}>
            <Pressable
              onPress={() => setShowDetailsModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 18,
                padding: 12,
                borderWidth: 1,
                borderColor: '#f1f5f9',
              }}
            >
              {/* Thumbnails row */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {order?.items?.slice(0, 3).map((item, idx) => {
                  const imageSource =
                    getProductImageSource(item) || { uri: optimizeCloudinaryUrl(item.image, 200) };
                  return (
                    <View
                      key={idx}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: idx > 0 ? -10 : 0,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <Image
                        source={imageSource}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                      />
                    </View>
                  );
                })}
              </View>

              {/* Label & Details link */}
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                  {itemCount} Items · ₹{orderTotal}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                  View order details
                </Text>
              </View>

              <ChevronRight size={18} color="#0f172a" strokeWidth={2.4} />
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>

      {/* Full Order Breakdown Modal when 'View order details' is tapped */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderColor: '#f1f5f9',
            }}
          >
            <View>
              <Text style={{ fontSize: 19, fontWeight: '900', color: '#0f172a' }}>
                Order #{order?.orderNo}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                Full Order Details
              </Text>
            </View>
            <Pressable
              onPress={() => setShowDetailsModal(false)}
              hitSlop={10}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color="#0f172a" strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {/* Items Breakdown */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 14 }}>
                Items ({itemCount})
              </Text>

              {order?.items?.map((item, i) => {
                const imgSource =
                  getProductImageSource(item) || { uri: optimizeCloudinaryUrl(item.image, 200) };
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: '#f8fafc',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: '#f8fafc',
                          borderWidth: 1,
                          borderColor: '#f1f5f9',
                          marginRight: 12,
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Image
                          source={imgSource}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="contain"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                          Qty: {item.qty} {item.variantLabel ? `· ${item.variantLabel}` : ''}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                      ₹{(item.price * item.qty).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Bill Details */}
            <View
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: 18,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
                Bill Summary
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13.5, color: '#64748b' }}>Item Total</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0f172a' }}>
                  ₹{(order?.subtotal || orderTotal).toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13.5, color: '#64748b' }}>Delivery Fee</Text>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#059669' }}>
                  {order?.deliveryFee ? `₹${order.deliveryFee}` : 'FREE'}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#0f172a' }}>To Pay</Text>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#059669' }}>
                  ₹{orderTotal}
                </Text>
              </View>
            </View>

            {/* Delivery Address */}
            {order?.addressSnapshot && (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <MapPin size={16} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                    Delivery Address
                  </Text>
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#334155', lineHeight: 19 }}>
                  {order.addressSnapshot.houseNo}, {order.addressSnapshot.street}
                  {order.addressSnapshot.landmark ? `, ${order.addressSnapshot.landmark}` : ''}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Pincode: {order.addressSnapshot.pincode}
                </Text>
              </View>
            )}

            {/* Repeat Order Button */}
            <Pressable
              onPress={handleRepeatOrder}
              disabled={repeating}
              style={{
                backgroundColor: '#059669',
                borderRadius: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={17} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                {repeating ? 'Adding items...' : 'Repeat Order'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
