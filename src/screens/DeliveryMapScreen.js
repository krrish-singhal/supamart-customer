import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Modal,
  StatusBar,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle,
  Navigation,
  Phone,
  Truck,
  AlertCircle,
  Clock,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  isTrackingActive,
} from '../services/backgroundLocation';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'PLACEHOLDER_API_KEY';

export default function DeliveryMapScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { order: initialOrder } = route.params;
  const { userProfile } = useContext(AuthContext);

  const [order, setOrder] = useState(initialOrder);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bgTrackingOn, setBgTrackingOn] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    isAlert: false,
    onConfirm: null,
  });

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const mapRef = useRef(null);

  // Fetch store configuration coordinates
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiClient.get('/config');
        setConfig(res.data);
      } catch (err) {
        console.error('Failed to fetch config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Manage location tracking & background service
  useEffect(() => {
    let locationSubscription;

    const initTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for delivery tracking.');
        return;
      }

      // 1. Start foreground watcher for in-app map movement
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 8,
          timeInterval: 10000,
        },
        (loc) => {
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

      // 2. If order is actively out for delivery, start persistent background notification
      if (order.status === 'OUT_FOR_DELIVERY') {
        const res = await startBackgroundTracking({
          orderNo: order.orderNo,
          partnerId: userProfile?.id,
        });
        if (res.success) {
          setBgTrackingOn(true);
        }
      } else {
        const active = await isTrackingActive();
        setBgTrackingOn(active);
      }
    };

    initTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [order.id, order.status, userProfile?.id]);

  const updateOrderStatus = async (newStatus, successMessage) => {
    setUpdating(true);
    try {
      const res = await apiClient.patch(`/orders/${order.id}/status`, { status: newStatus });
      const updatedOrder = res.data.order || { ...order, status: newStatus };
      setOrder(updatedOrder);

      // Manage background tracking lifecycle based on status
      if (newStatus === 'OUT_FOR_DELIVERY') {
        await startBackgroundTracking({
          orderNo: order.orderNo,
          partnerId: userProfile?.id,
        });
        setBgTrackingOn(true);
      } else if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED' || newStatus === 'PENDING_CONFIRMATION') {
        await stopBackgroundTracking();
        setBgTrackingOn(false);
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
      title: 'Pick Up Order',
      message: 'Confirm you have collected this order from the store and are starting delivery?',
      isAlert: false,
      onConfirm: () => updateOrderStatus('OUT_FOR_DELIVERY', 'Order is now Out for Delivery! Background tracking enabled.'),
    });
  };

  const handleDeliver = () => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Delivery',
      message: 'Have you handed this order to the customer?',
      isAlert: false,
      onConfirm: () => updateOrderStatus('PENDING_CONFIRMATION', 'Order delivery recorded! Customer will confirm.'),
    });
  };

  const callCustomer = () => {
    if (order.userPhone) {
      Linking.openURL(`tel:${order.userPhone}`);
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
   * Launch external Google Maps navigation while ensuring background tracking stays active
   */
  const openExternalMaps = async () => {
    const lat = order.addressSnapshot?.lat;
    const lng = order.addressSnapshot?.lng;
    if (!lat || !lng) return;

    // Ensure background tracking is actively running before opening Google Maps
    try {
      await startBackgroundTracking({
        orderNo: order.orderNo,
        partnerId: userProfile?.id,
      });
      setBgTrackingOn(true);
    } catch (_) {}

    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const label = encodeURIComponent(`MS Traders Delivery #${order.orderNo}`);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '600', color: '#64748b' }}>
          Loading delivery details...
        </Text>
      </View>
    );
  }

  const destination = {
    latitude: order.addressSnapshot?.lat || 0,
    longitude: order.addressSnapshot?.lng || 0,
  };

  const origin = config && config.storeLat ? {
    latitude: config.storeLat,
    longitude: config.storeLng,
  } : destination;

  const routeOrigin = partnerLocation || origin;
  const hasValidCoordinates = destination.latitude !== 0 && destination.longitude !== 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" />

      {/* MAP VIEW */}
      {hasValidCoordinates ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: destination.latitude,
            longitude: destination.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          <Marker coordinate={origin} title="MS Traders Store" tracksViewChanges={tracksViewChanges}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: '#059669',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2.5,
                borderColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Truck size={17} color="#ffffff" />
            </View>
          </Marker>

          <Marker coordinate={destination} title="Customer Delivery Address" description={order.addressSnapshot?.addressLine1} tracksViewChanges={tracksViewChanges}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#0f172a',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2.5,
                borderColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Navigation size={17} color="#ffffff" />
            </View>
          </Marker>

          {partnerLocation && (
            <Marker coordinate={partnerLocation} title="Your Location" tracksViewChanges={tracksViewChanges}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#059669',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                <Truck size={18} color="#059669" />
              </View>
            </Marker>
          )}

          {GOOGLE_MAPS_API_KEY !== 'PLACEHOLDER_API_KEY' && (
            <MapViewDirections
              origin={routeOrigin}
              destination={destination}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={4.5}
              strokeColor="#059669"
              onReady={(result) => {
                mapRef.current?.fitToCoordinates(result.coordinates, {
                  edgePadding: { top: 120, right: 50, bottom: 350, left: 50 },
                  animated: true,
                });
              }}
            />
          )}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', paddingBottom: 250 }]}>
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
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Coordinates Incomplete</Text>
          <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            Using address details for navigation. Tap below to navigate with Google Maps.
          </Text>
        </View>
      )}

      {/* TOP FLOATING CONTROLS */}
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
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: bgTrackingOn ? '#15803d' : '#64748b' }}>
            {bgTrackingOn ? 'Live GPS Active' : 'GPS Ready'}
          </Text>
        </View>

        {/* Navigate in Google Maps Button */}
        {hasValidCoordinates && (
          <Pressable
            onPress={openExternalMaps}
            style={{
              backgroundColor: '#059669',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Navigation size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
              Google Maps
            </Text>
            <ExternalLink size={12} color="rgba(255, 255, 255, 0.85)" style={{ marginLeft: 4 }} />
          </Pressable>
        )}
      </View>

      {/* BOTTOM SHEET DELIVERY CARD */}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginVertical: 10 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>
                Order #{order.orderNo}
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
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>
                  {order.status?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginTop: 4 }}>
              {order.userName || 'Customer'}
            </Text>

            <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2, lineHeight: 18 }}>
              {order.addressSnapshot?.houseNo ? `${order.addressSnapshot.houseNo}, ` : ''}
              {order.addressSnapshot?.street || order.addressSnapshot?.addressLine1 || 'Delivery Address'}
              {order.addressSnapshot?.landmark ? ` (Near ${order.addressSnapshot.landmark})` : ''}
            </Text>

            {order.notes ? (
              <View style={{ backgroundColor: '#fffbeb', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#fef3c7' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#b45309' }}>
                  Customer Note: {order.notes}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Quick Call Button */}
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
            marginTop: 4,
            marginBottom: isExpanded ? 10 : 12,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#475569' }}>
            Items to Deliver ({order.items?.length || 0}) · ₹{order.total || order.totalAmount || 0}
          </Text>
          {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
        </Pressable>

        {isExpanded && (
          <ScrollView style={{ maxHeight: 160, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
            {order.items?.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  marginBottom: 4,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.name}</Text>
                  {item.variantLabel ? (
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b' }}>{item.variantLabel}</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>x{item.qty}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action Buttons: Pick Up / Mark Delivered */}
        {order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED' && order.status !== 'PENDING_CONFIRMATION' ? (
          <Pressable
            onPress={handlePickUp}
            disabled={updating}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#059669',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              opacity: updating ? 0.6 : 1,
            }}
          >
            <Truck size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
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
                  ? '#f97316'
                  : order.status === 'DELIVERED'
                  ? '#94a3b8'
                  : '#059669',
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
            <CheckCircle size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
              {updating
                ? 'Updating...'
                : order.status === 'DELIVERED'
                ? 'Delivered'
                : order.status === 'PENDING_CONFIRMATION'
                ? 'Waiting for Customer...'
                : 'Mark Order Delivered'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* CONFIRMATION MODAL */}
      <Modal visible={confirmModal.visible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
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
            }}
          >
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

            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>
              {confirmModal.title}
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '500', color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
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
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#475569' }}>Cancel</Text>
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
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
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
