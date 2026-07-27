import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Check, Package, Truck, MapPin, RefreshCcw } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Header, Card, Skeleton, Button } from '../components/ui';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';

const STATUS_STEPS = [
  { key: 'ORDER_PLACED', label: 'Order Placed', icon: Check },
  { key: 'ORDER_ACCEPTED', label: 'Order Accepted', icon: Check },
  { key: 'PACKING', label: 'Packing Items', icon: Package },
  { key: 'READY_FOR_DELIVERY', label: 'Ready for Pickup', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Check },
];

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId, orderNo } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repeating, setRepeating] = useState(false);

  const handleRepeatOrder = async () => {
    setRepeating(true);
    try {
      const items = order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty
      }));
      
      await apiClient.put('/cart', { items });
      
      Toast.show({ type: 'success', text1: 'Items added to cart.' });
      navigation.navigate('Main', { screen: 'Cart' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Could not repeat order.' });
    } finally {
      setRepeating(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <Header title={`Order #${orderNo}`} onBack={() => navigation.goBack()} />
        <View className="p-4">
          <Skeleton width="100%" height={100} borderRadius={24} className="mb-6" />
          <Skeleton width="100%" height={300} borderRadius={24} className="mb-6" />
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Track Order" onBack={() => navigation.goBack()} />
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Status headline */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card elevation="sm" className={`border-0 mb-6 flex-row items-center justify-between p-5 ${isCancelled ? 'bg-red-50' : 'bg-primary-600'}`}>
            <View>
              <Text className={`text-2xl font-black mb-1 ${isCancelled ? 'text-red-600' : 'text-white'}`}>
                {isCancelled ? 'Cancelled' : STATUS_STEPS[currentIndex]?.label || order.status}
              </Text>
              <Text className={`text-sm font-medium ${isCancelled ? 'text-red-400' : 'text-primary-100'}`}>
                Order #{order.orderNo}
              </Text>
            </View>
            <View className={`w-12 h-12 rounded-full items-center justify-center ${isCancelled ? 'bg-red-100' : 'bg-white/20'}`}>
              {isCancelled ? <Check size={24} color="#dc2626" /> : <Package size={24} color="#fff" />}
            </View>
          </Card>
        </Animated.View>

        {/* Timeline */}
        {!isCancelled && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Card elevation="sm" className="mb-6 p-5 border-0 bg-white">
              {STATUS_STEPS.map((step, i) => {
                const done = i <= currentIndex;
                const isCurrent = i === currentIndex;
                const Icon = step.icon;
                return (
                  <View key={step.key} className="flex-row mb-4">
                    <View className="items-center mr-4">
                      <View className={`w-6 h-6 rounded-full items-center justify-center z-10 ${
                        done ? 'bg-[#059669]' : 'bg-[#e2e8f0]'
                      }`}>
                        {done && <Check size={14} color="#fff" />}
                      </View>
                      {i < STATUS_STEPS.length - 1 && (
                        <View className={`absolute top-6 w-0.5 h-12 ${done && !isCurrent ? 'bg-[#059669]' : 'bg-[#e2e8f0]'}`} />
                      )}
                    </View>
                    <View className="flex-1 pb-8">
                      <Text className={`text-base ${isCurrent ? 'font-bold text-primary-600' : done ? 'font-bold text-text-primary' : 'font-medium text-text-tertiary'}`}>
                        {step.label}
                      </Text>
                      {order.statusHistory?.find((h) => h.status === step.key) && (
                        <Text className="text-xs font-medium text-text-tertiary mt-1">
                          {new Date(order.statusHistory.find((h) => h.status === step.key).at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </Animated.View>
        )}

        {/* Order summary */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card elevation="sm" className="p-5 border-0 bg-white mb-6">
            <Text className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Order Summary</Text>
            {order.items?.map((item, i) => (
              <View key={i} className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center flex-1 pr-4">
                  <Text className="text-sm font-medium text-text-primary" numberOfLines={2}>
                    {item.qty} × {item.name} <Text className="text-text-tertiary text-xs">({item.variantLabel})</Text>
                  </Text>
                </View>
                <Text className="text-sm font-bold text-text-primary">₹{(item.price * item.qty).toFixed(2)}</Text>
              </View>
            ))}
            <View className="h-px bg-border-light my-4" />
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-bold text-[#059669]">Total Paid</Text>
              <Text className="text-lg font-black text-[#059669]">₹{order.total?.toFixed(2)}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Delivery address */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Card elevation="sm" className="p-4 border-0 bg-white flex-row items-start">
            <MapPin size={24} color="#059669" className="mr-4 mt-1" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Delivery Details</Text>
            <Text className="text-sm font-bold text-text-primary mb-1">
              {order.addressSnapshot?.houseNo}, {order.addressSnapshot?.street}
            </Text>
            {order.addressSnapshot?.landmark && (
              <Text className="text-xs font-medium text-text-secondary mb-0.5">
                Landmark: {order.addressSnapshot.landmark}
              </Text>
            )}
              <Text className="text-sm text-text-secondary font-medium mt-1">{order.addressSnapshot?.pincode}</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)} className="mt-4">
          <Button
            title="Repeat Last Order"
            onPress={handleRepeatOrder}
            loading={repeating}
            icon={!repeating && <RefreshCcw size={18} color="#fff" />}
            style={{ backgroundColor: '#059669', height: 50, borderRadius: 8 }}
            textStyle={{ fontWeight: '700', fontSize: 16 }}
            fullWidth
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
