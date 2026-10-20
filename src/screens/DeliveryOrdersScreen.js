import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
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
} from 'lucide-react-native';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Loader } from '../components/ui';
import EmptyState from '../components/EmptyState';
import {
  stopBackgroundTracking,
  startBackgroundTracking,
  isTrackingActive,
} from '../services/backgroundLocation';

const STATUS_THEME = {
  ORDER_PLACED: { bg: '#fef3c7', text: '#b45309', label: 'Placed' },
  ORDER_ACCEPTED: { bg: '#e0f2fe', text: '#0369a1', label: 'Ready for Pickup' },
  OUT_FOR_DELIVERY: { bg: '#dcfce7', text: '#15803d', label: 'Out for Delivery' },
  PENDING_CONFIRMATION: { bg: '#ffedd5', text: '#c2410c', label: 'Confirming' },
  DELIVERED: { bg: '#f1f5f9', text: '#475569', label: 'Delivered' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' },
};

export default function DeliveryOrdersScreen({ navigation }) {
  const { userProfile, setToken, setUserProfile } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ACTIVE'); // 'ACTIVE' | 'PAST'

  // Check initial tracking status
  useEffect(() => {
    isTrackingActive().then((active) => {
      setIsOnDuty(active);
    });
  }, []);

  const handleUpdateLocation = async () => {
    setUpdatingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLoc = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      if (userProfile?.id) {
        await apiClient.patch(`/delivery-partners/${userProfile.id}/location`, newLoc);
        Toast.show({ type: 'success', text1: 'Location synced successfully!' });
      }
    } catch (err) {
      console.error('Update location error:', err);
      Toast.show({ type: 'error', text1: 'Failed to sync location' });
    } finally {
      setUpdatingLoc(false);
    }
  };

  const toggleDuty = async () => {
    if (isOnDuty) {
      await stopBackgroundTracking();
      setIsOnDuty(false);
      Toast.show({
        type: 'info',
        text1: 'Off Duty',
        text2: 'Background tracking disabled & notification cleared.',
      });
    } else {
      const activeOrder = orders.find((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
      await startBackgroundTracking({
        orderNo: activeOrder?.orderNo,
        partnerId: userProfile?.id,
      });
      setIsOnDuty(true);
      Toast.show({
        type: 'success',
        text1: 'On Duty',
        text2: 'Live GPS tracking active for deliveries.',
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/orders');
      const items = res.data.items || [];
      setOrders(items);
      // If there are no active deliveries, automatically shut off tracking
      const hasActive = items.some((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
      if (!hasActive) {
        stopBackgroundTracking();
        setIsOnDuty(false);
      }
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
    fetchOrders();
  };

  const logout = async () => {
    await stopBackgroundTracking();
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('authMode');
    setToken(null);
    setUserProfile(null);
  };

  if (loading) return <Loader />;

  const activeOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter((o) => ['DELIVERED', 'CANCELLED'].includes(o.status));
  const displayOrders = selectedTab === 'ACTIVE' ? activeOrders : completedOrders;

  const renderOrderItem = ({ item }) => {
    const statusCfg = STATUS_THEME[item.status] || { bg: '#f1f5f9', text: '#475569', label: item.status };
    const itemCount = item.items?.reduce((s, it) => s + (it.qty || 1), 0) || item.items?.length || 0;
    const isOutForDelivery = item.status === 'OUT_FOR_DELIVERY';

    return (
      <Pressable
        onPress={() => navigation.navigate('DeliveryMap', { order: item })}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 18,
          padding: 16,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: isOutForDelivery ? '#86efac' : '#f1f5f9',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* Header row: Order # and Status pill */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>
              Order #{item.orderNo}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Clock size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11.5, fontWeight: '500', color: '#94a3b8' }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: statusCfg.bg,
              paddingHorizontal: 10,
              paddingVertical: 4.5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: statusCfg.text }}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Delivery address */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              marginTop: 1,
            }}
          >
            <MapPin size={15} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
              {item.userName || 'Customer'}
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }} numberOfLines={2}>
              {item.addressSnapshot?.houseNo ? `${item.addressSnapshot.houseNo}, ` : ''}
              {item.addressSnapshot?.street || item.addressSnapshot?.addressLine1 || 'Delivery Address'}
              {item.addressSnapshot?.landmark ? ` (Near ${item.addressSnapshot.landmark})` : ''}
            </Text>
          </View>
        </View>

        {/* Footer info: items & Navigate button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderColor: '#f8fafc',
            paddingTop: 12,
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Package size={14} color="#64748b" style={{ marginRight: 5 }} />
            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#64748b' }}>
              {itemCount} item{itemCount !== 1 ? 's' : ''} · ₹{item.total || item.totalAmount || 0}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isOutForDelivery ? '#059669' : '#f0fdf4',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isOutForDelivery ? '#059669' : '#bbf7d0',
            }}
          >
            <Navigation size={13} color={isOutForDelivery ? '#ffffff' : '#047857'} style={{ marginRight: 5 }} />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isOutForDelivery ? '#ffffff' : '#047857',
              }}
            >
              {isOutForDelivery ? 'Deliver Now' : 'View & Deliver'}
            </Text>
            <ChevronRight size={14} color={isOutForDelivery ? '#ffffff' : '#047857'} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER */}
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#059669',
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              MS Traders Delivery
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>
            {userProfile?.name ? `Hello, ${userProfile.name.split(' ')[0]}` : 'My Deliveries'}
          </Text>
        </View>

        {/* Sync location & Logout buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Duty status toggle */}
          <Pressable
            onPress={toggleDuty}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isOnDuty ? '#ecfdf5' : '#f1f5f9',
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isOnDuty ? '#a7f3d0' : '#e2e8f0',
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: isOnDuty ? '#16a34a' : '#94a3b8',
                marginRight: 5,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isOnDuty ? '#15803d' : '#64748b',
              }}
            >
              {isOnDuty ? 'On Duty' : 'Off Duty'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleUpdateLocation}
            disabled={updatingLoc}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ecfdf5',
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#a7f3d0',
            }}
          >
            <Navigation size={13} color="#059669" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
              {updatingLoc ? 'Sync...' : 'Sync'}
            </Text>
          </Pressable>

          <Pressable
            onPress={logout}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#fef2f2',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#fee2e2',
            }}
          >
            <LogOut size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      {/* SEGMENTED TAB SWITCHER */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#f8fafc',
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 8,
          borderRadius: 12,
          padding: 3,
          borderWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Pressable
          onPress={() => setSelectedTab('ACTIVE')}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: selectedTab === 'ACTIVE' ? '#ffffff' : 'transparent',
            shadowColor: selectedTab === 'ACTIVE' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: selectedTab === 'ACTIVE' ? 2 : 0,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: selectedTab === 'ACTIVE' ? '#047857' : '#64748b',
            }}
          >
            Active Deliveries ({activeOrders.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedTab('PAST')}
          style={{
            flex: 1,
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: selectedTab === 'PAST' ? '#ffffff' : 'transparent',
            shadowColor: selectedTab === 'PAST' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: selectedTab === 'PAST' ? 2 : 0,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: selectedTab === 'PAST' ? '#047857' : '#64748b',
            }}
          >
            Completed ({completedOrders.length})
          </Text>
        </Pressable>
      </View>

      {/* ORDERS LIST */}
      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="package"
            message={
              selectedTab === 'ACTIVE'
                ? 'No active deliveries assigned right now.'
                : 'No past deliveries recorded yet.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}
