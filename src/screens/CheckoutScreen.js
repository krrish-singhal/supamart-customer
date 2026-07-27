import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, Pressable, StatusBar,
} from 'react-native';
import { MapPin, CreditCard, ChevronRight, Check, Minus, Plus, Tag, Trash2, Sparkles } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { Header, Card, Button, Input, Skeleton, ProductCard } from '../components/ui';
import { useCart } from '../context/CartContext';

export default function CheckoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { 
    items, subtotal, discount, total, couponCode, couponDetails, 
    updateQty, addItem, removeCoupon, applyCoupon, clearCart, getQty 
  } = useCart();
  
  const [config, setConfig] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [deliveryTip, setDeliveryTip] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, addrRes] = await Promise.all([
        apiClient.get('/config'),
        apiClient.get('/auth/me').then(res => apiClient.get(`/users/${res.data.id}/addresses`)).catch(() => ({ data: { items: [] } })),
      ]);
      setConfig(configRes.data);
      
      const addrList = addrRes.data.items || [];
      setAddresses(addrList);
      setSelectedAddress(prev => {
        if (prev && addrList.find(a => a.id === prev.id)) {
          const maxTime = Math.max(...addrList.map(a => a.createdAt || 0));
          const latest = addrList.find(a => a.createdAt === maxTime);
          if (latest && prev.createdAt && latest.createdAt > prev.createdAt) return latest;
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
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const q = query(collection(db, 'products'), limit(30));
        const snap = await getDocs(q);
        const allProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Find categories of items currently in cart
        const cartCategories = new Set(items.map(i => i.categoryId));
        
        let recs = [];
        if (cartCategories.size > 0) {
          // If items in cart, recommend items from similar categories not in cart
          recs = allProds.filter(p => cartCategories.has(p.categoryId) && !items.find(i => i.productId === p.id));
        }
        
        // If not enough recommendations, fallback to random items not in cart
        if (recs.length < 5) {
          const others = allProds.filter(p => !items.find(i => i.productId === p.id) && !recs.find(r => r.id === p.id));
          recs = [...recs, ...others].slice(0, 8);
        }
        
        setRecommendations(recs.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchRecs();
  }, []);

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  async function handleApplyCoupon() {
    setApplying(true);
    try {
      await applyCoupon(couponInput);
    } finally {
      setApplying(false);
    }
  }

  async function placeOrder() {
    if (!selectedAddress || !selectedSlot) return;
    setPlacing(true);
    try {
      const finalNotes = notes + (deliveryTip > 0 ? `\n[Delivery Tip: ₹${deliveryTip}]` : '');
      const { data } = await apiClient.post('/orders', {
        cartItems: items,
        couponCode: couponCode,
        address: {
          houseNo: selectedAddress.houseNo,
          street: selectedAddress.street,
          landmark: selectedAddress.landmark,
          pincode: selectedAddress.pincode,
          lat: selectedAddress.lat,
          lng: selectedAddress.lng,
        },
        slot: { label: selectedSlot.label, from: selectedSlot.from, to: selectedSlot.to },
        notes: finalNotes,
        paymentMethod,
        deliveryTip,
      });
      clearCart();
      Toast.show({ type: 'success', text1: 'Order placed!', text2: `Order #${data.orderNo} confirmed.` });
      navigation.replace('OrderTracking', { orderId: data.id, orderNo: data.orderNo });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Checkout Failed',
        text2: 'Something went wrong. Please check your connection and try again.',
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

  if (!items?.length) return <EmptyState icon="cart" message="Cart is empty" onRetry={() => navigation.navigate('Home')} buttonText="Keep Shopping" />;

  const activeSlots = (config?.slots || []).filter((s) => s.active);
  const deliveryFee = 25;
  const handlingFee = 5;
  const baseTotal = subtotal - discount;
  const finalToPay = baseTotal + deliveryFee + handlingFee;

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Checkout" onBack={() => navigation.goBack()} />
      
      {discount > 0 && (
        <Animated.View entering={FadeInDown.duration(400)} className="bg-emerald-50 px-4 py-2.5 flex-row items-center justify-center border-b border-emerald-100 shadow-sm">
          <Sparkles size={16} color="#10b981" />
          <Text className="text-emerald-700 font-bold ml-2">₹{discount} Saved with '{couponCode}'</Text>
        </Animated.View>
      )}

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* Delivering to Home */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <Card className="mx-4 mt-4 mb-4 p-4 bg-white border border-border-light rounded-2xl flex-row items-center justify-between" elevation="sm">
             <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
               <MapPin size={24} color="#64748b" style={{ marginRight: 12 }} />
               <View style={{ flex: 1, paddingRight: 12 }}>
                 <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 }}>Delivering to Home</Text>
                 <Text style={{ fontSize: 13, color: '#475569' }} numberOfLines={2}>
                   {selectedAddress ? `${selectedAddress.houseNo}, ${selectedAddress.street}, ${selectedAddress.pincode}` : 'Select Delivery Address'}
                 </Text>
               </View>
             </View>
             <Pressable onPress={() => navigation.navigate('MyAddresses')}>
               <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>Edit</Text>
             </Pressable>
          </Card>
        </Animated.View>

        {/* Cart Items */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Card className="mx-4 mb-6 p-4 bg-white border border-border-light rounded-2xl" elevation="sm">
            {items.map((item, index) => (
              <View key={`${item.productId}-${item.variantId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index !== items.length - 1 ? 20 : 0 }}>
                <View style={{ width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                  {((item.images && item.images[0]) || item.image) ? (
                    <Image source={{ uri: (item.images && item.images[0]) || item.image }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <ShoppingBag size={24} color="#cbd5e1" />
                  )}
                </View>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#0f172a', marginBottom: 4 }}>{item.name} ({item.variantLabel})</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>₹{item.price.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                  <Pressable onPress={() => updateQty(item.productId, item.variantId, -1)} style={{ width: 32, height: 32, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={14} color="#64748b" strokeWidth={3} />
                  </Pressable>
                  <Text style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{item.qty}</Text>
                  <Pressable onPress={() => updateQty(item.productId, item.variantId, 1)} style={{ width: 32, height: 32, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={14} color="#ffffff" strokeWidth={3} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Apply Coupon */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)}>
          <Card className="mx-4 mb-6 p-4 bg-white border border-border-light rounded-2xl" elevation="sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Apply Coupon</Text>
              <Pressable>
                <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>View Offers</Text>
              </Pressable>
            </View>
            <View className="flex-row items-center">
              <Input
                containerStyle={{ flex: 1, marginBottom: 0 }}
                style={{ height: 46, borderRadius: 4 }}
                placeholder="Input Coupon"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
            </View>
            {discount > 0 && (
              <View className="flex-row items-center justify-between mt-4 p-3.5 bg-emerald-50 rounded-lg border border-emerald-100">
                <Text className="text-sm font-bold text-text-primary">₹{discount} saved!</Text>
                <Pressable onPress={removeCoupon}>
                  <Text className="text-xs font-bold text-red-500">Remove</Text>
                </Pressable>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Bill Details */}
        <Animated.View entering={FadeInUp.duration(400).delay(250)}>
          <Card className="mx-4 mb-6 p-5 bg-white border border-border-light rounded-2xl" elevation="sm">
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 16 }}>Bill Details</Text>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm font-medium text-text-secondary">Item Total:</Text>
              <Text className="text-sm font-medium text-text-primary">₹{(subtotal - discount).toFixed(2)}</Text>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-sm font-medium text-text-secondary">Delivery Fee:</Text>
              <Text className="text-sm font-medium text-text-primary">₹{deliveryFee.toFixed(2)}</Text>
            </View>

            <View className="flex-row justify-between mb-4">
              <Text className="text-sm font-medium text-text-secondary">Handling Fee:</Text>
              <Text className="text-sm font-medium text-text-primary">₹{handlingFee.toFixed(2)}</Text>
            </View>

            <View className="h-[1px] bg-border-light mb-4" />

            <View className="flex-row justify-between items-center">
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#16a34a' }}>Total to Pay</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#16a34a' }}>₹{finalToPay.toFixed(2)}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Cancellation Policy */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} className="px-6 mb-8">
          <Text className="text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">Cancellation Policy</Text>
          <Text className="text-xs font-medium text-text-tertiary leading-5">Please double-check your order and address details. Orders are non-refundable once placed.</Text>
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <Animated.View entering={FadeInDown.duration(400).delay(400)} className="px-5 pt-4 bg-white border-t border-border-light flex-row items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="flex-1 mr-4">
          <Text className="text-xs font-bold text-text-secondary mb-0.5 uppercase tracking-wider">Total To Pay</Text>
          <Text className="text-2xl font-black text-text-primary">₹{finalToPay.toFixed(2)}</Text>
        </View>
        <Button
          title="Proceed to Pay"
          onPress={placeOrder}
          disabled={placing || !selectedAddress || !selectedSlot}
          loading={placing}
          style={{ backgroundColor: '#16a34a', height: 50, borderRadius: 4, paddingHorizontal: 20 }}
          textStyle={{ fontWeight: '800', fontSize: 16 }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
