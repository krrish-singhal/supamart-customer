import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, Pressable, StatusBar,
} from 'react-native';
import { MapPin, Clock, CreditCard, ChevronRight, Check } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { Header, Card, Button, Input, Skeleton } from '../components/ui';
import { useCart } from '../context/CartContext';

export default function CheckoutScreen({ navigation }) {
  const { clearCart } = useCart();
  const [cart, setCart] = useState(null);
  const [config, setConfig] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    if (!cart) setLoading(true);
    try {
      // Backend automatically maps 'me' to the current user's profile based on JWT token
      const [cartRes, configRes, addrRes] = await Promise.all([
        apiClient.get('/cart'),
        apiClient.get('/config'),
        apiClient.get('/auth/me').then(res => apiClient.get(`/users/${res.data.id}/addresses`)).catch(() => ({ data: { items: [] } })),
      ]);
      setCart(cartRes.data);
      setConfig(configRes.data);
      const addrList = addrRes.data.items || [];
      setAddresses(addrList);
      setSelectedAddress(prev => {
        if (prev && addrList.find(a => a.id === prev.id)) {
          // If a new address was just added and no default exists, maybe select it?
          // But it's safer to keep what was already selected, they can tap the new one.
          // Wait, if we want to auto-select the latest one if it's new:
          const maxTime = Math.max(...addrList.map(a => a.createdAt || 0));
          const latest = addrList.find(a => a.createdAt === maxTime);
          if (latest && prev.createdAt && latest.createdAt > prev.createdAt) {
             return latest; // Auto-select newly added address
          }
          return addrList.find(a => a.id === prev.id);
        }
        return addrList.find((a) => a.isDefault) || addrList[addrList.length - 1] || null;
      });
      const activeSlots = (configRes.data.slots || []).filter((s) => s.active);
      setSelectedSlot(activeSlots[0] || { label: 'ASAP (Within 45 mins)', from: 0, to: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function placeOrder() {
    if (!selectedAddress || !selectedSlot) return;
    setPlacing(true);
    try {
      const { data } = await apiClient.post('/orders', {
        cartItems: cart.items,
        couponCode: cart.couponCode,
        address: {
          houseNo: selectedAddress.houseNo,
          street: selectedAddress.street,
          landmark: selectedAddress.landmark,
          pincode: selectedAddress.pincode,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
        },
        slot: { label: selectedSlot.label, from: selectedSlot.from, to: selectedSlot.to },
        notes,
        paymentMethod,
      });
      clearCart();
      Toast.show({ type: 'success', text1: 'Order placed!', text2: `Order #${data.orderNo} confirmed.` });
      navigation.replace('OrderTracking', { orderId: data.id, orderNo: data.orderNo });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Order failed',
        text2: err.response?.data?.error || err.message || 'Please try again.',
      });
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <Header title="Checkout" onBack={() => navigation.goBack()} />
        <View className="p-4">
          <Skeleton width="100%" height={140} borderRadius={20} className="mb-4" />
          <Skeleton width="100%" height={100} borderRadius={20} className="mb-4" />
          <Skeleton width="100%" height={120} borderRadius={20} />
        </View>
      </SafeAreaView>
    );
  }

  if (!cart?.items?.length) return <EmptyState icon="cart" message="Cart is empty" />;

  const activeSlots = (config?.slots || []).filter((s) => s.active);

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Checkout" onBack={() => navigation.goBack()} />
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        
        {/* Delivery Address */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider ml-1">Delivery Address</Text>
          <Card elevation="sm" className="mb-6 p-4 border-0">
            {addresses.length === 0 ? (
              <Pressable
                onPress={() => navigation.navigate('AddAddress')}
                className="flex-row items-center py-2"
              >
                <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center mr-3">
                  <MapPin size={16} color="#16a34a" />
                </View>
                <Text className="text-sm font-bold text-primary-600 flex-1">+ Add New Address</Text>
                <ChevronRight size={16} color="#94a3b8" />
              </Pressable>
            ) : (
              addresses.map((addr) => (
                <Pressable
                  key={addr.id}
                  onPress={() => setSelectedAddress(addr)}
                  className={`flex-row items-start py-3 ${selectedAddress?.id !== addr.id ? 'opacity-70' : ''}`}
                >
                  <View className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 items-center justify-center ${
                    selectedAddress?.id === addr.id ? 'border-primary-600' : 'border-border-dark'
                  }`}>
                    {selectedAddress?.id === addr.id && (
                      <View className="w-2.5 h-2.5 rounded-full bg-primary-600" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm ${selectedAddress?.id === addr.id ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>
                      {addr.houseNo}, {addr.street}
                    </Text>
                    {addr.landmark && (
                      <Text className="text-xs text-text-tertiary font-medium mt-1">{addr.landmark}</Text>
                    )}
                    <Text className="text-xs text-text-tertiary font-medium mt-0.5">{addr.pincode}</Text>
                  </View>
                </Pressable>
              ))
            )}
            {addresses.length > 0 && (
              <Pressable onPress={() => navigation.navigate('AddAddress')} className="mt-2 pt-3 border-t border-border-light flex-row items-center">
                <Text className="text-sm font-bold text-primary-600">+ Add New Address</Text>
              </Pressable>
            )}
          </Card>
        </Animated.View>

        {/* Delivery Slot */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider ml-1">Delivery Time</Text>
          <Card elevation="sm" className="mb-6 p-4 border-0">
            <View className="flex-row flex-wrap gap-2">
              {(activeSlots.length ? activeSlots : [{ label: 'ASAP (Within 45 mins)', from: 0, to: 0 }]).map((slot) => (
                <Pressable
                  key={slot.label}
                  onPress={() => setSelectedSlot(slot)}
                  className={`px-4 py-2.5 rounded-xl border ${
                    selectedSlot?.label === slot.label
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-border-light bg-surface-50'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selectedSlot?.label === slot.label ? 'text-primary-700' : 'text-text-secondary'
                    }`}
                  >
                    {slot.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Payment */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider ml-1">Payment Method</Text>
          <Card elevation="sm" className="mb-6 p-4 border-0">
            {['COD', 'UPI'].map((method) => (
              <Pressable
                key={method}
                onPress={() => setPaymentMethod(method)}
                className="flex-row items-center py-3"
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  paymentMethod === method ? 'border-primary-600' : 'border-border-dark'
                }`}>
                  {paymentMethod === method && <View className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
                </View>
                <View className="flex-row items-center flex-1">
                  {method === 'COD' ? <CreditCard size={18} color="#64748b" className="mr-2" /> : <MapPin size={18} color="#64748b" className="mr-2" />}
                  <Text className={`text-sm ${paymentMethod === method ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>
                    {method === 'COD' ? 'Cash on Delivery' : 'UPI'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        </Animated.View>

        {/* Notes */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Text className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider ml-1">Order Notes</Text>
          <Input
            style={{ height: 96, paddingTop: 12, paddingBottom: 12 }}
            placeholder="e.g. Leave at the door, call before arriving..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* CTA Footer */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(400)}
          className="mt-4 mb-8"
        >
          <Card elevation="sm" className="mb-4 p-4 border-0">
            <Text className="text-sm font-bold text-text-primary mb-3">Bill Summary</Text>
            
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium text-text-secondary">Item Total</Text>
              <Text className="text-sm font-medium text-text-primary">₹{cart?.subtotal?.toFixed(2)}</Text>
            </View>

            {cart?.discount > 0 && (
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-text-secondary">
                  Coupon Discount ({cart.couponCode} - {cart.couponDetails?.value || ''}{cart.couponDetails?.kind === 'PERCENT' ? '%' : '₹'} off)
                </Text>
                <Text className="text-sm font-bold text-primary-600">-₹{cart.discount.toFixed(2)}</Text>
              </View>
            )}

            {config?.taxPercent > 0 && (
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-text-secondary">GST ({config.taxPercent}%)</Text>
                <Text className="text-sm font-medium text-text-primary">
                  ₹{(((cart?.subtotal - (cart?.discount || 0)) * config.taxPercent) / 100).toFixed(2)}
                </Text>
              </View>
            )}

            <View className="h-[1px] bg-border-light my-2" />

            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-base font-bold text-text-primary">To Pay</Text>
              <Text className="text-lg font-black text-primary-600">
                ₹{((cart?.subtotal - (cart?.discount || 0)) * (1 + (config?.taxPercent || 0) / 100)).toFixed(2)}
              </Text>
            </View>
          </Card>
          <Button
            title={placing ? 'Processing...' : 'Place Order securely'}
            onPress={placeOrder}
            disabled={placing || !selectedAddress || !selectedSlot}
            loading={placing}
            size="lg"
            icon={!placing && <Check size={20} color="#fff" />}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
