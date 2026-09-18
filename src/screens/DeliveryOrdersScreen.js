import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Phone, LogOut, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Loader, Badge, Card } from '../components/ui';
import EmptyState from '../components/EmptyState';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_COLORS = {
  ORDER_PLACED: 'bg-yellow-100 text-yellow-800',
  ORDER_ACCEPTED: 'bg-blue-100 text-blue-800',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function DeliveryOrdersScreen({ navigation }) {
  const { userProfile, setToken, setUserProfile } = React.useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingLoc, setUpdatingLoc] = useState(false);

  const handleUpdateLocation = async () => {
    setUpdatingLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' });
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const newLoc = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      
      if (userProfile?.id) {
        await apiClient.patch(`/delivery-partners/${userProfile.id}/location`, newLoc);
        Toast.show({ type: 'success', text1: 'Location updated successfully!' });
      }
    } catch (err) {
      console.error('Update location error:', err);
      Toast.show({ type: 'error', text1: 'Failed to update location' });
    } finally {
      setUpdatingLoc(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/orders');
      // The backend returns paginated result: { items: [], hasNextPage, ... }
      setOrders(res.data.items || []);
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
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('authMode');
    setToken(null);
    setUserProfile(null);
  };

  if (loading) return <Loader />;

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status));

  const renderOrderItem = ({ item }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DeliveryMap', { order: item })}
        className="mb-4"
      >
        <Card className="p-4 bg-white border border-border-light rounded-2xl" elevation="sm">
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <Text className="text-sm font-bold text-text-primary">Order #{item.orderNo}</Text>
              <Text className="text-xs text-text-muted mt-0.5">{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <Badge label={item.status.replace(/_/g, ' ')} className={STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800'} />
          </View>
          
          <View className="flex-row items-start mb-2">
            <MapPin size={16} color="#64748b" style={{ marginTop: 2, marginRight: 8 }} />
            <Text className="flex-1 text-sm text-text-secondary" numberOfLines={2}>
              {item.addressSnapshot?.houseNo}, {item.addressSnapshot?.street}
              {item.addressSnapshot?.landmark ? ` (${item.addressSnapshot.landmark})` : ''}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border-light">
            <View className="flex-row items-center">
              <Phone size={14} color="#64748b" style={{ marginRight: 6 }} />
              <Text className="text-sm font-medium text-text-secondary">{item.userPhone || 'No phone'}</Text>
            </View>
            <View className="bg-primary/10 px-3 py-1.5 rounded-lg">
              <Text className="text-xs font-bold text-primary">View Details & Map</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="px-4 py-4 flex-row justify-between items-center bg-white border-b border-border-light">
        <View style={{ flex: 1 }}>
          <Text className="text-lg font-black text-text-primary">My Deliveries</Text>
          <Text className="text-xs text-text-muted">Welcome back, {userProfile?.name}</Text>
        </View>
        
        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            onPress={handleUpdateLocation} 
            disabled={updatingLoc}
            className="flex-row items-center bg-primary/10 px-3 py-2 rounded-xl"
          >
            <Navigation size={16} color="#16a34a" style={{ marginRight: 6 }} />
            <Text className="text-xs font-bold text-primary">
              {updatingLoc ? 'Updating...' : 'Send Location'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={logout} className="p-2 bg-red-50 rounded-full">
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeOrders.length > 0 ? activeOrders : completedOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyState icon="package" message="No assigned deliveries." />}
        ListHeaderComponent={
          orders.length > 0 ? (
            <Text className="text-sm font-bold text-text-secondary mt-2 mb-4 uppercase tracking-wider">
              {activeOrders.length > 0 ? 'Active Deliveries' : 'Past Deliveries'}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
