import { STORE_LOCATION, validCoordinates } from '../config/deliveryArea';
import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  Linking,
  ScrollView,
  Modal,
  StatusBar,
  TextInput,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import KeylessMap from '../components/maps/KeylessMap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle,
  Navigation,
  Phone,
  Truck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
} from '../components/icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
} from '../services/backgroundLocation';
import { fonts } from '../theme/typography';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import BrandBadge from '../components/BrandBadge';

const DELAY_PRESET_REASONS = [
  'Heavy Traffic Congestion',
  'Bad Weather / Heavy Rain',
  'Vehicle Breakdown / Flat Tyre',
  'Road Closure / Long Detour',
  'Store Pickup Delay',
];

const DELAY_PRESET_TIMES = ['+10 mins', '+15 mins', '+20 mins', '+30 mins', '+45 mins'];

export default function DeliveryMapScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const initialOrder = route?.params?.order || null;
  const { userProfile } = useContext(AuthContext);

  const [order, setOrder] = useState(initialOrder);
  const [updating, setUpdating] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bgTrackingOn, setBgTrackingOn] = useState(false);

  // Delay reporting modal state
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [selectedDelayReason, setSelectedDelayReason] = useState('');
  const [customDelayReason, setCustomDelayReason] = useState('');
  const [selectedDelayTime, setSelectedDelayTime] = useState('+15 mins');
  const [customDelayTime, setCustomDelayTime] = useState('');
  const [submittingDelay, setSubmittingDelay] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    isAlert: false,
    onConfirm: null,
  });

  const mapRef = useRef(null);

  // 1. Subscribe to Live Order updates from Firestore
  useEffect(() => {
    if (!order?.id) return;
    const unsub = onSnapshot(
      doc(db, 'orders', String(order.id)),
      (snap) => {
        if (snap.exists()) {
          const fresh = { id: snap.id, ...snap.data() };
          setOrder((prev) => ({ ...prev, ...fresh }));
        }
      },
      (err) => console.warn('DeliveryMapScreen order snapshot error:', err)
    );
    return () => unsub();
  }, [order?.id]);

  // 2. Manage location tracking & background service
  useEffect(() => {
    let locationSubscription;
    let isMounted = true;

    const initTracking = async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
        if (perm?.status !== 'granted') {
          Alert.alert('Permission needed', 'Location permission allows updating your delivery progress to the customer and admin.');
          return;
        }

        if (!isMounted) return;

        // Start foreground watcher for in-app map movement
        try {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 8,
              timeInterval: 10000,
            },
            (loc) => {
              if (!isMounted || !loc?.coords) return;
              const newLoc = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              };
              setPartnerLocation(newLoc);

              if (userProfile?.id) {
                apiClient
                  .patch(`/delivery-partners/${userProfile.id}/location`, {
                    lat: newLoc.latitude,
                    lng: newLoc.longitude,
                  })
                  .catch((e) => console.log('Location sync:', e?.message));
              }
            }
          );
        } catch (watchErr) {
          console.warn('[DeliveryMapScreen] watchPositionAsync error:', watchErr?.message);
        }

        if (!isMounted) return;

        // If order is actively out for delivery, ensure background tracking
        try {
          if (order?.status === 'OUT_FOR_DELIVERY') {
            const res = await startBackgroundTracking({
              orderNo: order?.orderNo,
              partnerId: userProfile?.id,
            });
            if (isMounted && res?.success) {
              setBgTrackingOn(true);
            }
          } else {
            const active = await isTrackingActive();
            if (isMounted) {
              setBgTrackingOn(active);
            }
          }
        } catch (bgErr) {
          console.warn('[DeliveryMapScreen] background tracking error:', bgErr?.message);
        }
      } catch (err) {
        console.warn('[DeliveryMapScreen] initTracking failed safely:', err?.message);
      }
    };

    if (order?.id) {
      initTracking();
    }

    return () => {
      isMounted = false;
      if (locationSubscription) {
        try {
          locationSubscription.remove();
        } catch (_) {}
      }
    };
  }, [order?.id, order?.status, order?.orderNo, userProfile?.id]);

  const updateOrderStatus = async (newStatus, successMessage) => {
    if (!order?.id) return;
    setUpdating(true);
    try {
      const res = await apiClient.patch(`/orders/${order.id}/status`, { status: newStatus });
      const updatedOrder = res.data.order || { ...order, status: newStatus };
      setOrder(updatedOrder);

      // Manage background tracking lifecycle based on status safely
      try {
        if (newStatus === 'OUT_FOR_DELIVERY') {
          const tracking = await startBackgroundTracking({
            orderNo: order?.orderNo,
            partnerId: userProfile?.id,
          });
          setBgTrackingOn(tracking?.success || false);
        } else if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED' || newStatus === 'PENDING_CONFIRMATION') {
          await stopBackgroundTracking();
          setBgTrackingOn(false);
        }
      } catch (bgErr) {
        console.warn('[DeliveryMapScreen] status background tracking error:', bgErr?.message);
      }

      setConfirmModal({
        visible: true,
        title: 'Success',
        message: successMessage,
        isAlert: true,
        onConfirm: () => {
          if (newStatus === 'DELIVERED' || newStatus === 'PENDING_CONFIRMATION') {
            navigation.goBack();
          }
        },
      });
    } catch (err) {
      console.error('Update status error:', err);
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: 'Failed to update order status.',
        isAlert: true,
        onConfirm: null,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePickUp = () => {
    setConfirmModal({
      visible: true,
      title: 'Start Delivery',
      message: 'Confirm you have collected this order and are heading to the customer?',
      isAlert: false,
      onConfirm: () => updateOrderStatus('OUT_FOR_DELIVERY', 'Order is now Out for Delivery! Live tracking enabled.'),
    });
  };

  const handleDeliver = () => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Delivery',
      message: 'Have you reached the customer and handed over this order? The customer will receive a verification prompt to confirm and rate.',
      isAlert: false,
      onConfirm: () => updateOrderStatus('PENDING_CONFIRMATION', 'Order delivery recorded! Awaiting customer confirmation.'),
    });
  };

  const callCustomer = () => {
    const phone = order?.userPhone || order?.addressSnapshot?.phone || order?.address?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Call Failed', 'Unable to open dialer on this device.');
      });
    } else {
      setConfirmModal({
        visible: true,
        title: 'Unavailable',
        message: 'No phone number provided by the customer.',
        isAlert: true,
        onConfirm: null,
      });
    }
  };

  /**
   * Submit delay report with mandatory time and reason
   */
  const handleSubmitDelay = async () => {
    const finalReason = (customDelayReason.trim() || selectedDelayReason.trim());
    const finalTime = (customDelayTime.trim() || selectedDelayTime.trim());

    if (!finalReason) {
      Toast.show({
        type: 'error',
        text1: 'Reason Required',
        text2: 'Please state the reason for the delivery delay.',
      });
      return;
    }

    if (!finalTime) {
      Toast.show({
        type: 'error',
        text1: 'Delivery Time Required',
        text2: 'Please specify the updated estimated delivery time.',
      });
      return;
    }

    setSubmittingDelay(true);
    try {
      const res = await apiClient.patch(`/orders/${order.id}/delivery-delay`, {
        newEstimatedTime: finalTime,
        delayReason: finalReason,
      });

      const updated = res.data || {};
      setOrder((prev) => ({ ...prev, ...updated }));
      setDelayModalVisible(false);

      Toast.show({
        type: 'success',
        text1: 'Time Updated',
        text2: 'Delivery time updated & customer notified.',
      });
    } catch (err) {
      console.error('Submit delay error:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to Update Time',
        text2: err.response?.data?.error || 'Network error, please try again.',
      });
    } finally {
      setSubmittingDelay(false);
    }
  };

  /**
   * Launch external Google Maps navigation
   */
  const openExternalMaps = async () => {
    const lat = order?.addressSnapshot?.lat;
    const lng = order?.addressSnapshot?.lng;
    if (!lat || !lng) return;

    try {
      const tracking = await startBackgroundTracking({
        orderNo: order?.orderNo,
        partnerId: userProfile?.id,
      });
      if (tracking?.success) setBgTrackingOn(true);
    } catch (_) {}

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(googleMapsUrl).catch(() => {
      Linking.openURL(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`).catch(() => {});
    });
  };

  const addr = order?.addressSnapshot || order?.address || {};
  const rawDestLat = Number(addr?.lat ?? addr?.latitude ?? order?.lat ?? order?.latitude);
  const rawDestLng = Number(addr?.lng ?? addr?.longitude ?? order?.lng ?? order?.longitude);
  const hasValidCoordinates =
    !isNaN(rawDestLat) &&
    !isNaN(rawDestLng) &&
    rawDestLat !== 0 &&
    rawDestLng !== 0 &&
    validCoordinates(rawDestLat, rawDestLng);

  const destination = useMemo(() => {
    return hasValidCoordinates ? { latitude: rawDestLat, longitude: rawDestLng } : null;
  }, [hasValidCoordinates, rawDestLat, rawDestLng]);

  const origin = useMemo(() => ({
    latitude: Number(STORE_LOCATION.lat),
    longitude: Number(STORE_LOCATION.lng),
  }), []);

  const routeOrigin = partnerLocation || origin;
  const orderTotal = Math.round(Number(order?.total || order?.totalAmount) || 0);

  // Resume handler: refresh GPS location and re-align map when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            setPartnerLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        } catch (_) {}

        if (destination) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates([
              origin,
              destination,
              ...(partnerLocation ? [partnerLocation] : []),
            ]);
          }, 350);
        }
      }
    });
    return () => sub.remove();
  }, [destination, origin, partnerLocation]);

  // Screen focus handler: re-fit map when navigating to or returning to screen
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (destination) {
          mapRef.current?.fitToCoordinates([
            origin,
            destination,
            ...(partnerLocation ? [partnerLocation] : []),
          ]);
        }
      }, 400);
      return () => clearTimeout(timer);
    }, [destination, origin, partnerLocation])
  );

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <AlertCircle size={32} color="#64748b" />
        </View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#0f172a', marginBottom: 6 }}>
          Order Details Unavailable
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
          Could not load the requested delivery details.
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#ffffff' }}>Back to Deliveries</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />

      {/* MAP VIEW */}
      {hasValidCoordinates && destination ? (
        <KeylessMap
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialCenter={destination}
          selected={destination}
          rider={partnerLocation}
          route={[routeOrigin, destination]}
          onReady={() => mapRef.current?.fitToCoordinates([origin, destination, ...(partnerLocation ? [partnerLocation] : [])])}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', paddingBottom: 280 }]}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Navigation size={28} color="#059669" />
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#0f172a' }}>Coordinates Incomplete</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            Using address details for navigation. Open your navigation app for road directions.
          </Text>
          <Pressable
            onPress={openExternalMaps}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#059669',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 14,
              marginTop: 16,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#059669', marginRight: 4 }}>Open in Maps</Text>
            <ExternalLink size={13} color="#059669" />
          </Pressable>
        </View>
      )}

      {/* TOP FLOATING CONTROLS matching Screenshot 3 & 4 */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <ArrowLeft size={20} color="#0f172a" strokeWidth={2.6} />
          </Pressable>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              height: 44,
              paddingHorizontal: 8,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <BrandBadge size={26} />
          </View>
        </View>

        {/* Live GPS Broadcast Indicator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderWidth: 1,
            borderColor: bgTrackingOn ? '#86efac' : '#e2e8f0',
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: bgTrackingOn ? '#16a34a' : '#94a3b8',
              marginRight: 6,
            }}
          />
          <Text style={{ fontFamily: fonts.bold, fontSize: 11.5, color: bgTrackingOn ? '#15803d' : '#64748b' }}>
            {bgTrackingOn ? 'Live GPS Active' : 'GPS ready'}
          </Text>
        </View>

        {/* Navigate button */}
        {hasValidCoordinates && (
          <Pressable
            onPress={openExternalMaps}
            style={{
              backgroundColor: '#047857',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Navigation size={14} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#ffffff' }}>
              Navigate
            </Text>
            <ExternalLink size={12} color="rgba(255, 255, 255, 0.85)" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
      </View>

      {/* BOTTOM SHEET DELIVERY CARD matching Screenshot 3 & 4 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 10,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        {/* Drag handle */}
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          style={{ alignItems: 'center', paddingVertical: 6 }}
        >
          <View style={{ width: 40, height: 4.5, borderRadius: 3, backgroundColor: '#cbd5e1' }} />
        </Pressable>

        {/* Order No and Customer details */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginVertical: 8 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 20, color: '#0f172a' }}>
                Order #{order.orderNo || order.id?.slice(-4)}
              </Text>
              <View
                style={{
                  marginLeft: 8,
                  backgroundColor: '#ecfdf5',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: '#059669', textTransform: 'uppercase' }}>
                  {order.status === 'OUT_FOR_DELIVERY'
                    ? 'OUT FOR DELIVERY'
                    : order.status === 'PENDING_CONFIRMATION'
                    ? 'WAITING CONFIRMATION'
                    : order.status?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#1e293b', marginTop: 3 }}>
              {order.userName || order.addressSnapshot?.name || 'Customer'}
            </Text>

            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#64748b', marginTop: 2, lineHeight: 18 }}>
              {order.addressSnapshot?.houseNo ? `${order.addressSnapshot.houseNo}, ` : ''}
              {order.addressSnapshot?.street || order.addressSnapshot?.addressLine1 || order.address?.street || 'Delivery Address'}
              {order.addressSnapshot?.landmark ? ` (Near ${order.addressSnapshot.landmark})` : ''}
            </Text>

            {order.notes || order.deliveryInstructions ? (
              <View style={{ backgroundColor: '#fffbeb', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#fef3c7' }}>
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 11.5, color: '#b45309' }}>
                  Note: {order.notes || (typeof order.deliveryInstructions === 'string'
                    ? order.deliveryInstructions
                    : order.deliveryInstructions?.combinedNote || order.deliveryInstructions?.summary)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Customer Call Button */}
          <Pressable
            onPress={callCustomer}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#a7f3d0',
            }}
          >
            <Phone size={22} color="#059669" />
          </Pressable>
        </View>

        {/* PAYMENT BANNER: ALWAYS "Paid online · nothing to collect" matching Screenshot 4 */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginVertical: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#0f172a' }}>
            Paid online · nothing to collect
          </Text>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 15, color: '#0f172a' }}>
            ₹{orderTotal}
          </Text>
        </View>

        {/* EDIT DELIVERY TIME / REPORT DELAY OPTION */}
        <Pressable
          onPress={() => setDelayModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: order.delayReason ? '#fef3c7' : '#f0fdf4',
            borderWidth: 1,
            borderColor: order.delayReason ? '#fde68a' : '#bbf7d0',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Clock size={15} color={order.delayReason ? '#b45309' : '#059669'} style={{ marginRight: 6 }} />
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 12,
                color: order.delayReason ? '#92400e' : '#065f46',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {order.delayReason
                ? `Delay Reported: ${order.delayReason} · Tap to update`
                : 'Need more time? Report delay (Traffic / Weather)'}
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11.5, color: order.delayReason ? '#b45309' : '#059669', marginLeft: 6 }}>
            Edit
          </Text>
        </Pressable>

        {/* Collapsible Order Items Section */}
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
            borderTopWidth: 1,
            borderBottomWidth: isExpanded ? 1 : 0,
            borderColor: '#f1f5f9',
            marginBottom: isExpanded ? 8 : 10,
          }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#475569' }}>
            Items to deliver ( {order.items?.length || 0} )
          </Text>
          {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
        </Pressable>

        {isExpanded && (
          <ScrollView style={{ maxHeight: 150, marginBottom: 10 }} showsVerticalScrollIndicator={false}>
            {order.items?.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  marginBottom: 4,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#0f172a' }}>{item.name}</Text>
                  {item.variantLabel ? (
                    <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: '#64748b' }}>{item.variantLabel}</Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#0f172a' }}>x{item.qty}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action Button: Pickup, Deliver, or Awaiting Confirmation */}
        {order.deliveryAcceptanceStatus === 'REJECTED' ? (
          <View
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#fee2e2',
              borderWidth: 1,
              borderColor: '#fca5a5',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            <AlertCircle size={20} color="#b91c1c" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#b91c1c' }}>
              Order Assignment Rejected
            </Text>
          </View>
        ) : order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED' && order.status !== 'PENDING_CONFIRMATION' ? (
          <Pressable
            onPress={handlePickUp}
            disabled={updating}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#047857',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              opacity: updating ? 0.6 : 1,
            }}
          >
            <Truck size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: '#ffffff' }}>
              {updating ? 'Updating...' : 'Start Delivery & Pick Up'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={order.status === 'OUT_FOR_DELIVERY' ? handleDeliver : null}
            disabled={updating || order.status === 'DELIVERED' || order.status === 'PENDING_CONFIRMATION'}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor:
                order.status === 'PENDING_CONFIRMATION'
                  ? '#ea580c'
                  : order.status === 'DELIVERED'
                  ? '#94a3b8'
                  : '#047857',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 4,
              opacity: updating ? 0.6 : 1,
            }}
          >
            {order.status === 'PENDING_CONFIRMATION' ? (
              <Clock size={20} color="#ffffff" style={{ marginRight: 8 }} />
            ) : (
              <CheckCircle size={20} color="#ffffff" style={{ marginRight: 8 }} />
            )}
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: '#ffffff' }}>
              {updating
                ? 'Updating...'
                : order.status === 'DELIVERED'
                ? 'Delivered (Confirmed)'
                : order.status === 'PENDING_CONFIRMATION'
                ? 'Waiting for customer confirmation...'
                : 'Mark order delivered'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── REPORT DELAY MODAL ── */}
      <Modal
        visible={delayModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDelayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.delayModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={20} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Update Delivery Time</Text>
              </View>
              <Pressable
                onPress={() => setDelayModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748b" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Both the updated time and reason are mandatory. An automatic email and in-app notification will be sent to the customer instantly.
            </Text>

            {/* Field 1: New Delivery Time (Mandatory) */}
            <Text style={styles.fieldLabel}>
              Updated Delivery Time <Text style={{ color: '#dc2626' }}>*</Text>
            </Text>
            <View style={styles.chipRow}>
              {DELAY_PRESET_TIMES.map((timeOption) => (
                <Pressable
                  key={timeOption}
                  onPress={() => {
                    setSelectedDelayTime(timeOption);
                    setCustomDelayTime('');
                  }}
                  style={[
                    styles.chipBtn,
                    selectedDelayTime === timeOption && !customDelayTime && styles.chipBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedDelayTime === timeOption && !customDelayTime && styles.chipTextActive,
                    ]}
                  >
                    {timeOption}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Or enter custom time (e.g. 5:45 PM)"
              value={customDelayTime}
              onChangeText={(txt) => setCustomDelayTime(txt)}
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
            />

            {/* Field 2: Delay Reason (Mandatory) */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Reason for Delay <Text style={{ color: '#dc2626' }}>*</Text>
            </Text>
            <View style={styles.chipRowWrap}>
              {DELAY_PRESET_REASONS.map((reasonOption) => (
                <Pressable
                  key={reasonOption}
                  onPress={() => {
                    setSelectedDelayReason(reasonOption);
                    setCustomDelayReason('');
                  }}
                  style={[
                    styles.chipBtn,
                    selectedDelayReason === reasonOption && !customDelayReason && styles.chipBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedDelayReason === reasonOption && !customDelayReason && styles.chipTextActive,
                    ]}
                  >
                    {reasonOption}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Or write custom reason (Mandatory)..."
              value={customDelayReason}
              onChangeText={(txt) => setCustomDelayReason(txt)}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={2}
              style={[styles.textInput, { minHeight: 46 }]}
            />

            {/* Submit Delay Button */}
            <Pressable
              onPress={handleSubmitDelay}
              disabled={submittingDelay}
              style={styles.submitDelayBtn}
            >
              {submittingDelay ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitDelayBtnText}>
                  Update Time
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CONFIRMATION / ALERT MODAL */}
      <Modal visible={confirmModal.visible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#ecfdf5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <AlertCircle size={28} color="#059669" />
            </View>

            <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>
              {confirmModal.title}
            </Text>

            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
              {confirmModal.message}
            </Text>

            <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
              {!confirmModal.isAlert && (
                <Pressable
                  onPress={() => setConfirmModal({ visible: false, title: '', message: '', isAlert: false, onConfirm: null })}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#475569' }}>Cancel</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ visible: false, title: '', message: '', isAlert: false, onConfirm: null });
                }}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#ffffff' }}>
                  {confirmModal.isAlert ? 'OK' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  delayModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 16,
  },
  fieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#1e293b',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: '#475569',
  },
  chipTextActive: {
    fontFamily: fonts.bold,
    color: '#059669',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#0f172a',
  },
  submitDelayBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitDelayBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#ffffff',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
