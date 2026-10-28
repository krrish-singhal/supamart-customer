import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  Switch,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  MapPin,
  LogOut,
  Navigation,
  Package,
  Clock,
  ChevronRight,
  RefreshCw,
  X,
  Check,
  Phone,
  AlertCircle,
} from '../components/icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Loader } from '../components/ui';
import EmptyState from '../components/EmptyState';
import BrandBadge from '../components/BrandBadge';
import { fonts } from '../theme/typography';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { stopBackgroundTracking } from '../services/backgroundLocation';

const STATUS_THEME = {
  ORDER_PLACED: { bg: '#fef3c7', text: '#b45309', label: 'Placed' },
  ORDER_ACCEPTED: { bg: '#e0f2fe', text: '#0369a1', label: 'Accepted' },
  OUT_FOR_DELIVERY: { bg: '#dcfce7', text: '#047857', label: 'Out for delivery' },
  PENDING_CONFIRMATION: { bg: '#fff7ed', text: '#c2410c', label: 'Awaiting Confirmation' },
  DELIVERED: { bg: '#e5e7eb', text: '#374151', label: 'Delivered' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' },
};

function formatOrderTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const date = d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  return `${time} · ${date}`;
}

function formatSyncTime(ts) {
  if (!ts) return 'Just now';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function DeliveryOrdersScreen({ navigation }) {
  const { userProfile, setToken, setUserProfile } = useContext(AuthContext);
  const [partnerData, setPartnerData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ACTIVE'); // 'ACTIVE' | 'COMPLETED'
  const [lastSyncedAt, setLastSyncedAt] = useState(Date.now());
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [respondingToOrder, setRespondingToOrder] = useState(false);

  // 1. Real-time subscription to Delivery Partner Profile for Duty status, name, and lastSyncedAt
  useEffect(() => {
    if (!userProfile?.id) return;
    const partnerDocRef = doc(db, 'deliveryPartners', String(userProfile.id));
    const unsub = onSnapshot(partnerDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPartnerData(data);
        if (typeof data.isOnDuty === 'boolean') {
          setIsOnDuty(data.isOnDuty);
        } else if (typeof data.isActive === 'boolean') {
          setIsOnDuty(data.isActive);
        }
        if (data.lastSyncedAt) {
          setLastSyncedAt(data.lastSyncedAt);
        }
      }
    });
    return () => unsub();
  }, [userProfile?.id]);

  // 2. Real-time subscription to orders assigned to this partner (strictly from DB)
  useEffect(() => {
    if (!userProfile?.id) return;
    const q = query(
      collection(db, 'orders'),
      where('assignedPartnerId', '==', String(userProfile.id))
    );

    const unsubOrders = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(items);
        setLoading(false);

        const pending = items.find(
          (o) =>
            o.deliveryAcceptanceStatus === 'PENDING' &&
            !['DELIVERED', 'CANCELLED'].includes(o.status)
        );
        setIncomingOrder(pending || null);
      },
      (err) => {
        console.warn('Delivery orders snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubOrders();
  }, [userProfile?.id]);

  // Sync Location to backend and Firestore
  const handleUpdateLocation = async (quiet = false) => {
    setUpdatingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!quiet) Toast.show({ type: 'error', text1: 'Location permission denied' });
        return false;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLoc = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      const now = Date.now();
      if (userProfile?.id) {
        await apiClient.patch(`/delivery-partners/${userProfile.id}/location`, newLoc);
        setLastSyncedAt(now);
        if (!quiet) {
          Toast.show({
            type: 'success',
            text1: 'Location Synced',
            text2: 'Admin tracking updated in real time.',
          });
        }
      }
      return true;
    } catch (err) {
      console.error('Update location error:', err);
      if (!quiet) Toast.show({ type: 'error', text1: 'Failed to sync location' });
      return false;
    } finally {
      setUpdatingLoc(false);
    }
  };

  // Toggle Duty
  const toggleDuty = async (newVal) => {
    const nextDuty = typeof newVal === 'boolean' ? newVal : !isOnDuty;
    setIsOnDuty(nextDuty);

    try {
      if (userProfile?.id) {
        await apiClient.patch(`/delivery-partners/${userProfile.id}/duty`, {
          isOnDuty: nextDuty,
        });

        await updateDoc(doc(db, 'deliveryPartners', String(userProfile.id)), {
          isOnDuty: nextDuty,
          isActive: nextDuty,
          dutyStatus: nextDuty ? 'ON_DUTY' : 'OFF_DUTY',
          updatedAt: Date.now(),
        });
      }

      if (!nextDuty) {
        await stopBackgroundTracking();
        Toast.show({
          type: 'info',
          text1: 'Off Duty',
          text2: 'You will not receive new order assignments.',
        });
      } else {
        await handleUpdateLocation(true);
        Toast.show({
          type: 'success',
          text1: 'On Duty',
          text2: 'Admin can now assign orders to you in real time.',
        });
      }
    } catch (err) {
      console.error('Toggle duty error:', err);
      setIsOnDuty(!nextDuty);
      Toast.show({ type: 'error', text1: 'Failed to update duty status' });
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/orders');
      const items = res.data.items || [];
      if (items.length) setOrders(items);
    } catch (err) {
      console.error('Fetch delivery orders error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    handleUpdateLocation(true);
    fetchOrders();
  };

  const logout = async () => {
    await stopBackgroundTracking();
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('authMode');
    setToken(null);
    setUserProfile(null);
  };

  // Accept incoming order
  const handleAcceptIncomingOrder = async () => {
    if (!incomingOrder?.id) return;
    setRespondingToOrder(true);
    try {
      await apiClient.patch(`/orders/${incomingOrder.id}/accept-assignment`);
      Toast.show({
        type: 'success',
        text1: 'Order Accepted!',
        text2: `Order #${incomingOrder.orderNo || incomingOrder.id.slice(-4)} added to active deliveries.`,
      });
      setIncomingOrder(null);
    } catch (err) {
      console.error('Accept order error:', err);
      Toast.show({ type: 'error', text1: 'Failed to accept order' });
    } finally {
      setRespondingToOrder(false);
    }
  };

  // Reject incoming order
  const handleRejectIncomingOrder = async () => {
    if (!incomingOrder?.id) return;
    const rejectingId = incomingOrder.id;
    setRespondingToOrder(true);
    try {
      await apiClient.patch(`/orders/${rejectingId}/reject-assignment`);
      // Immediately reflect rejection in local state so it is excluded from active orders
      setOrders((prev) =>
        prev.map((o) => (o.id === rejectingId ? { ...o, deliveryAcceptanceStatus: 'REJECTED' } : o))
      );
      Toast.show({
        type: 'info',
        text1: 'Order Rejected',
        text2: 'Order marked rejected. Admin will re-assign.',
      });
      setIncomingOrder(null);
    } catch (err) {
      console.error('Reject order error:', err);
      Toast.show({ type: 'error', text1: 'Failed to reject order' });
    } finally {
      setRespondingToOrder(false);
    }
  };

  // Open "View & Deliver": ensure location is synced, then navigate
  const handleViewAndDeliver = async (orderItem) => {
    if (orderItem.deliveryAcceptanceStatus === 'REJECTED') {
      Toast.show({
        type: 'error',
        text1: 'Order Rejected',
        text2: 'This order was rejected and cannot be delivered.',
      });
      return;
    }
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - (lastSyncedAt || 0) > fiveMinutes) {
      await handleUpdateLocation(true);
    }
    navigation.navigate('DeliveryMap', { order: orderItem });
  };

  if (loading) return <Loader />;

  // Orders are only completed when finalized as DELIVERED or CANCELLED.
  // PENDING_CONFIRMATION remains active until customer confirms delivery!
  const isOrderCompleted = (status) =>
    ['DELIVERED', 'CANCELLED'].includes(status);
  const activeOrders = orders.filter(
    (o) => !isOrderCompleted(o.status) && o.deliveryAcceptanceStatus !== 'REJECTED'
  );
  const completedOrders = orders.filter((o) => isOrderCompleted(o.status));
  const displayOrders = selectedTab === 'ACTIVE' ? activeOrders : completedOrders;

  // Partner display name from database (zero static mock text)
  const rawPartnerName = partnerData?.name || userProfile?.name || '';
  const partnerDisplayName = rawPartnerName ? rawPartnerName.split(' ')[0] : 'Partner';

  const renderOrderItem = ({ item }) => {
    const isCompleted = isOrderCompleted(item.status);
    const statusCfg = STATUS_THEME[item.status] || {
      bg: '#f1f5f9',
      text: '#374151',
      label: item.status?.replace(/_/g, ' ') || 'Active',
    };
    const itemCount =
      item.items?.reduce((s, it) => s + (it.qty || 1), 0) || item.items?.length || 0;
    const totalAmount = Number(item.total || item.totalAmount || 0).toFixed(2);
    const customerPhone =
      item.userPhone || item.addressSnapshot?.phone || item.address?.phone || item.phone;
    const customerName = item.userName || item.addressSnapshot?.name || 'Customer';

    const addressParts = [
      item.addressSnapshot?.houseNo,
      item.addressSnapshot?.street || item.addressSnapshot?.addressLine1 || item.address?.street,
      item.addressSnapshot?.landmark ? `(Near ${item.addressSnapshot.landmark})` : null,
    ].filter(Boolean);
    const addressLine = addressParts.length > 0 ? addressParts.join(', ') : 'Delivery Address';

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 14,
          backgroundColor: '#ffffff',
          borderRadius: 18,
          borderWidth: 1.2,
          borderColor: '#dce3dc',
          padding: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 5,
          elevation: 2,
        }}
      >
        {/* Header row: Order # and Status pill */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 10,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 16,
                color: '#0f172a',
              }}
            >
              Order #{item.orderNo || item.id?.slice(-4) || '---'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 3,
              }}
            >
              <Clock size={12} color="#6b7280" style={{ marginRight: 4 }} />
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 12,
                  color: '#6b7280',
                }}
              >
                {formatOrderTime(item.createdAt)}
              </Text>
            </View>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: statusCfg.bg,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 12,
                color: statusCfg.text,
              }}
            >
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Customer & Address Details matching target mockups */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#e6f7ef',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              marginTop: 2,
            }}
          >
            <MapPin size={18} color="#059669" />
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 14.5,
                  color: '#0f172a',
                  flex: 1,
                  marginRight: 6,
                }}
                numberOfLines={1}
              >
                {customerName}
              </Text>
              {customerPhone ? (
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    Linking.openURL(`tel:${customerPhone}`);
                  }}
                  hitSlop={8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ecfdf5',
                    borderWidth: 1,
                    borderColor: '#a7f3d0',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    gap: 3,
                  }}
                >
                  <Phone size={10} color="#059669" />
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 11,
                      color: '#059669',
                    }}
                  >
                    Call
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 12.5,
                color: '#4b5563',
                marginTop: 3,
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {addressLine}
            </Text>
          </View>
        </View>

        {/* Optional Delay Alert Banner from DB */}
        {item.delayReason ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fef2f2',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              marginTop: 10,
              borderWidth: 1,
              borderColor: '#fecaca',
            }}
          >
            <Clock size={13} color="#dc2626" style={{ marginRight: 6 }} />
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 12,
                color: '#dc2626',
                flex: 1,
              }}
              numberOfLines={1}
            >
              Delay: {item.delayReason}
              {item.deliveryDelay?.newEstimatedTime
                ? ` (ETA: ${item.deliveryDelay.newEstimatedTime})`
                : ''}
            </Text>
          </View>
        ) : null}

        {/* Optional Delivery Instructions from DB */}
        {item.deliveryInstructions ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fffbeb',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              marginTop: 8,
              borderWidth: 1,
              borderColor: '#fde68a',
            }}
          >
            <AlertCircle size={13} color="#b45309" style={{ marginRight: 6 }} />
            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 12,
                color: '#b45309',
                flex: 1,
              }}
              numberOfLines={1}
            >
              Note:{' '}
              {typeof item.deliveryInstructions === 'string'
                ? item.deliveryInstructions
                : item.deliveryInstructions.combinedNote ||
                  item.deliveryInstructions.summary ||
                  'Follow instructions'}
            </Text>
          </View>
        ) : null}

        {/* Subtle Divider Line */}
        <View
          style={{
            height: 1,
            backgroundColor: '#edf2ed',
            marginVertical: 12,
          }}
        />

        {/* Bottom Row: Items & Payment on Left, Action Button on Right */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Package size={14} color="#374151" style={{ marginRight: 5 }} />
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 13.5,
                  color: '#111827',
                }}
              >
                {itemCount} item{itemCount !== 1 ? 's' : ''} · ₹ {totalAmount}
              </Text>
            </View>
            {/* 100% Prepaid Online Store — ZERO COD / Collect Cash */}
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 12,
                color: '#6b7280',
                marginTop: 2,
              }}
            >
              Paid online
            </Text>
          </View>

          {!isCompleted ? (
            item.status === 'PENDING_CONFIRMATION' ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff7ed',
                  borderWidth: 1.2,
                  borderColor: '#fed7aa',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Clock size={13} color="#ea580c" style={{ marginRight: 5 }} />
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 12,
                    color: '#ea580c',
                  }}
                >
                  Waiting for customer...
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => handleViewAndDeliver(item)}
                hitSlop={6}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#047857',
                  paddingHorizontal: 15,
                  paddingVertical: 9.5,
                  borderRadius: 10,
                  shadowColor: '#047857',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Navigation size={13} color="#ffffff" style={{ marginRight: 5 }} />
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 13,
                    color: '#ffffff',
                  }}
                >
                  View & deliver
                </Text>
                <ChevronRight size={14} color="#ffffff" style={{ marginLeft: 3 }} />
              </Pressable>
            )
          ) : (
            <Pressable
              onPress={() => handleViewAndDeliver(item)}
              hitSlop={6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1.2,
                borderColor: '#cbd5e1',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 12.5,
                  color: '#1f2937',
                }}
              >
                View details
              </Text>
              <ChevronRight size={14} color="#1f2937" style={{ marginLeft: 3 }} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP FIXED CONTAINER (White background matching Image 3 & 4) */}
      <View
        style={{
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e5eae4',
        }}
      >
        {/* Header: MS TRADERS DELIVERY Branding, Greeting, Sync & Logout */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <BrandBadge size={28} showName />
              <View
                style={{
                  backgroundColor: '#ecfdf5',
                  borderWidth: 1,
                  borderColor: '#a7f3d0',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontWeight: 'normal',
                    fontSize: 9.5,
                    color: '#047857',
                    letterSpacing: 0.5,
                  }}
                >
                  DELIVERY
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontWeight: 'normal',
                fontSize: 19,
                color: '#0f172a',
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              Hello, {partnerDisplayName}
            </Text>
          </View>

          {/* Rounded Square Refresh/Sync and Logout Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={async () => {
                await handleUpdateLocation(false);
                fetchOrders();
              }}
              disabled={updatingLoc}
              hitSlop={8}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#f0fdf4',
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {updatingLoc ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <RefreshCw size={17} color="#059669" />
                )}
              </View>
            </Pressable>

            <Pressable onPress={logout} hitSlop={8}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogOut size={17} color="#ef4444" />
              </View>
            </Pressable>
          </View>
        </View>

        {/* DUTY TOGGLE CARD */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 8,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#f6f8f5',
            borderWidth: 1,
            borderColor: '#e2e7e0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 14.5,
                color: '#0f172a',
              }}
            >
              {isOnDuty ? "You're on duty" : "You're off duty"}
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 12,
                color: '#64748b',
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {isOnDuty
                ? 'Active · Ready for new orders'
                : 'Turn on to receive new orders'}
            </Text>
          </View>

          <Switch
            trackColor={{ false: '#cbd5e1', true: '#059669' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#cbd5e1"
            onValueChange={toggleDuty}
            value={isOnDuty}
          />
        </View>

        {/* SEGMENTED TAB SWITCHER */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#e9ede8',
            marginHorizontal: 16,
            borderRadius: 12,
            padding: 3,
            marginBottom: 6,
          }}
        >
          <Pressable
            onPress={() => setSelectedTab('ACTIVE')}
            style={{ flex: 1 }}
          >
            <View
              style={[
                {
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: 'transparent',
                },
                selectedTab === 'ACTIVE' && {
                  backgroundColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontFamily: selectedTab === 'ACTIVE' ? fonts.bold : fonts.semiBold,
                  color: selectedTab === 'ACTIVE' ? '#047857' : '#4b5563',
                }}
              >
                Active
              </Text>
              <View
                style={{
                  marginLeft: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 1.5,
                  borderRadius: 10,
                  backgroundColor: selectedTab === 'ACTIVE' ? '#dcfce7' : '#dce0db',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: fonts.bold,
                    color: selectedTab === 'ACTIVE' ? '#047857' : '#6b7280',
                  }}
                >
                  {activeOrders.length}
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setSelectedTab('COMPLETED')}
            style={{ flex: 1 }}
          >
            <View
              style={[
                {
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: 'transparent',
                },
                selectedTab === 'COMPLETED' && {
                  backgroundColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontFamily: selectedTab === 'COMPLETED' ? fonts.bold : fonts.semiBold,
                  color: selectedTab === 'COMPLETED' ? '#047857' : '#4b5563',
                }}
              >
                Completed
              </Text>
              <View
                style={{
                  marginLeft: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 1.5,
                  borderRadius: 10,
                  backgroundColor: selectedTab === 'COMPLETED' ? '#dcfce7' : '#dce0db',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: fonts.bold,
                    color: selectedTab === 'COMPLETED' ? '#047857' : '#6b7280',
                  }}
                >
                  {completedOrders.length}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Clean Last Synced Line */}
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 2,
            paddingBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            Last synced {formatSyncTime(lastSyncedAt)}
          </Text>
        </View>
      </View>

      {/* ORDERS LIST (Distinct light sage/gray background matching Image 3 & 4) */}
      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        style={{
          flex: 1,
          backgroundColor: '#eff2ee',
        }}
        contentContainerStyle={[
          {
            paddingTop: 14,
            paddingBottom: 28,
          },
          displayOrders.length === 0 && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
        ListEmptyComponent={
          <View
            style={{
              paddingVertical: 40,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EmptyState
              icon="truck"
              message={
                selectedTab === 'ACTIVE'
                  ? isOnDuty
                    ? 'No active deliveries right now'
                    : "You're currently off duty"
                  : 'No completed deliveries recorded yet'
              }
              subtitle={
                selectedTab === 'ACTIVE'
                  ? isOnDuty
                    ? 'New order assignments will appear here automatically.'
                    : 'Turn duty on above to start receiving delivery orders.'
                  : 'Orders you complete will be listed here for reference.'
              }
            />
          </View>
        }
      />

      {/* ── INCOMING ORDER MODAL (ACCEPT / REJECT) ── */}
      <Modal
        visible={Boolean(incomingOrder)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#ecfdf5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={24} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 13,
                    color: '#059669',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  New Order Assigned
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.extraBold,
                    fontSize: 19,
                    color: '#0f172a',
                  }}
                >
                  Order #{incomingOrder?.orderNo || incomingOrder?.id?.slice(-4)}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15,
                  color: '#0f172a',
                }}
              >
                {incomingOrder?.userName || incomingOrder?.addressSnapshot?.name || 'Customer'}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13,
                  color: '#64748b',
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                {incomingOrder?.addressSnapshot?.houseNo
                  ? `${incomingOrder.addressSnapshot.houseNo}, `
                  : ''}
                {incomingOrder?.addressSnapshot?.street ||
                  incomingOrder?.address?.street ||
                  'Delivery Address'}
                {incomingOrder?.addressSnapshot?.landmark
                  ? ` (Near ${incomingOrder.addressSnapshot.landmark})`
                  : ''}
              </Text>

              {incomingOrder?.deliveryInstructions ? (
                <View
                  style={{
                    backgroundColor: '#fffbeb',
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: '#fef3c7',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.semiBold,
                      fontSize: 12,
                      color: '#b45309',
                    }}
                  >
                    Instructions:{' '}
                    {typeof incomingOrder.deliveryInstructions === 'string'
                      ? incomingOrder.deliveryInstructions
                      : incomingOrder.deliveryInstructions.combinedNote ||
                        incomingOrder.deliveryInstructions.summary ||
                        'Follow instructions'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#f1f5f9',
                marginBottom: 10,
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 11,
                    color: '#64748b',
                  }}
                >
                  Items to Deliver
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 14,
                    color: '#0f172a',
                    marginTop: 2,
                  }}
                >
                  {incomingOrder?.items?.length || 0} item
                  {incomingOrder?.items?.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 11,
                    color: '#64748b',
                  }}
                >
                  Total (Paid Online)
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.extraBold,
                    fontSize: 16,
                    color: '#059669',
                    marginTop: 2,
                  }}
                >
                  ₹{Math.round(incomingOrder?.total || incomingOrder?.totalAmount || 0)}
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 11,
                color: '#64748b',
                textAlign: 'center',
                marginBottom: 16,
                lineHeight: 15,
              }}
            >
              You can accept multiple nearby orders to deliver in one efficient round.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={handleRejectIncomingOrder}
                disabled={respondingToOrder}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} color="#ef4444" style={{ marginRight: 4 }} />
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 14,
                    color: '#dc2626',
                  }}
                >
                  Reject
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAcceptIncomingOrder}
                disabled={respondingToOrder}
                style={{
                  flex: 1.5,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: '#059669',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {respondingToOrder ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        color: '#ffffff',
                      }}
                    >
                      Accept Order
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
