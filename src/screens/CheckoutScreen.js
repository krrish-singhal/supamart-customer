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

  if (!items?.length) return <EmptyState icon="cart" message="Cart is empty" onRetry={() => navigation.navigate('Home')} buttonText="Keep Shopping" />;

  const activeSlots = (config?.slots || []).filter((s) => s.active);
  const baseTotal = subtotal - discount;
  const calculatedGst = config?.taxPercent ? (baseTotal * config.taxPercent) / 100 : 0;
  const finalToPay = baseTotal + calculatedGst + deliveryTip;

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
        
        {/* Cart Items */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <Card className="mx-4 mt-4 mb-6 p-4 bg-white border border-border-light rounded-3xl" elevation="sm">
            {items.map((item, index) => (
              <View key={`${item.productId}-${item.variantId}`} className={`flex-row items-start ${index !== items.length - 1 ? 'mb-5' : ''}`}>
                <View className="w-4 h-4 rounded-sm border border-emerald-500 items-center justify-center mt-1 mr-3">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-bold text-text-primary mb-1">{item.name}</Text>
                  <Text className="text-xs font-medium text-text-tertiary mb-1.5">{item.variantLabel}</Text>
                  <Text className="text-sm font-bold text-text-primary">₹{item.price}</Text>
                </View>
                <View className="flex-row items-center bg-surface-50 rounded-xl p-1 border border-border-light shadow-sm">
                  <Pressable onPress={() => updateQty(item.productId, item.variantId, -1)} className="w-8 h-8 rounded-lg bg-white items-center justify-center shadow-sm border border-border-light">
                    {item.qty === 1 ? <Trash2 size={14} color="#ef4444" /> : <Minus size={14} color="#0f172a" />}
                  </Pressable>
                  <Text className="w-8 text-center text-sm font-bold text-text-primary">{item.qty}</Text>
                  <Pressable onPress={() => updateQty(item.productId, item.variantId, 1)} className="w-8 h-8 rounded-lg bg-primary-600 items-center justify-center shadow-sm">
                    <Plus size={14} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Recommendations */}
        {!loadingRecs && recommendations.length > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)} className="mb-6">
            <Text className="text-sm font-bold text-text-primary px-5 mb-3 uppercase tracking-wider">Before you checkout</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {recommendations.map(item => (
                <ProductCard
                  key={item.id}
                  item={item}
                  style={{ width: 140, marginRight: 12 }}
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                  qty={getQty(item.id, item.variants?.[0]?.id)}
                  onAdd={() => addItem(item, item.variants?.[0])}
                  onIncrement={() => addItem(item, item.variants?.[0])}
                  onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Savings Corner */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)}>
          <Card className="mx-4 mb-6 p-4 bg-white border border-border-light rounded-3xl" elevation="sm">
            <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Savings Corner</Text>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Tag size={20} color="#f97316" className="mr-3" />
                <Text className="text-sm font-bold text-text-primary">Apply Coupon</Text>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </View>
            <View className="flex-row items-center mt-1">
              <Input
                containerStyle={{ flex: 1, marginBottom: 0, marginRight: 10 }}
                style={{ height: 46 }}
                placeholder="Enter coupon code"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
              <Button
                title={couponCode ? 'Remove' : 'Apply'}
                onPress={couponCode ? removeCoupon : handleApplyCoupon}
                loading={applying}
                variant={couponCode ? 'outline' : 'primary'}
                size="sm"
                className="h-[46px] w-24"
              />
            </View>
            {discount > 0 && (
              <View className="flex-row items-center justify-between mt-4 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <View className="flex-row items-center">
                  <Tag size={16} color="#10b981" className="mr-2" />
                  <Text className="text-sm font-bold text-text-primary">₹{discount} saved!</Text>
                </View>
                <Text className="text-xs font-bold text-emerald-600">✓ Applied</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Delivery Options */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card className="mx-4 mb-6 p-4 bg-white border border-border-light rounded-3xl" elevation="sm">
            <Text className="text-sm font-bold text-text-primary mb-4">Delivery Options</Text>
            
            {/* Address */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Deliver To</Text>
              {addresses.length === 0 ? (
                <Pressable onPress={() => navigation.navigate('AddAddress')} className="flex-row items-center py-2">
                  <View className="w-8 h-8 rounded-full bg-primary-50 items-center justify-center mr-3">
                    <MapPin size={16} color="#16a34a" />
                  </View>
                  <Text className="text-sm font-bold text-primary-600 flex-1">+ Add New Address</Text>
                </Pressable>
              ) : (
                addresses.map((addr) => (
                  <Pressable key={addr.id} onPress={() => setSelectedAddress(addr)} className={`flex-row items-start py-2.5 ${selectedAddress?.id !== addr.id ? 'opacity-60' : ''}`}>
                    <View className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 items-center justify-center ${selectedAddress?.id === addr.id ? 'border-primary-600' : 'border-border-dark'}`}>
                      {selectedAddress?.id === addr.id && <View className="w-2.5 h-2.5 rounded-full bg-primary-600" />}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm ${selectedAddress?.id === addr.id ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>
                        {addr.houseNo}, {addr.street}
                      </Text>
                      <Text className="text-xs text-text-tertiary font-medium mt-1">{addr.pincode}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>

            {/* Time Slot */}
            <View className="mb-5">
              <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Delivery Time</Text>
              <View className="flex-row flex-wrap gap-2">
                {(activeSlots.length ? activeSlots : [{ label: 'ASAP (Within 45 mins)', from: 0, to: 0 }]).map((slot) => (
                  <Pressable key={slot.label} onPress={() => setSelectedSlot(slot)} className={`px-4 py-2.5 rounded-xl border ${selectedSlot?.label === slot.label ? 'border-primary-600 bg-primary-50' : 'border-border-light bg-surface-50'}`}>
                    <Text className={`text-sm font-semibold ${selectedSlot?.label === slot.label ? 'text-primary-700' : 'text-text-secondary'}`}>{slot.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Tip */}
            <View className="mb-2">
              <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Delivery Tip</Text>
              <Text className="text-xs font-medium text-text-tertiary mb-3">Your tip means a lot! 100% of your tip goes directly to your delivery partner.</Text>
              <View className="flex-row gap-2">
                {[10, 20, 30, 50].map(amt => (
                  <Pressable key={amt} onPress={() => setDeliveryTip(deliveryTip === amt ? 0 : amt)} className={`flex-1 items-center justify-center py-2.5 rounded-xl border ${deliveryTip === amt ? 'border-primary-600 bg-primary-50 shadow-sm' : 'border-border-light bg-white shadow-sm'}`}>
                    <Text className={`text-sm font-bold ${deliveryTip === amt ? 'text-primary-700' : 'text-text-primary'}`}>₹{amt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Bill Details */}
        <Animated.View entering={FadeInUp.duration(400).delay(250)}>
          <Card className="mx-4 mb-6 p-5 bg-white border border-border-light rounded-3xl" elevation="sm">
            <Text className="text-sm font-bold text-text-primary mb-4">Bill Details</Text>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-sm font-medium text-text-secondary">Item Total</Text>
              <View className="flex-row items-center">
                {discount > 0 && <Text className="text-xs line-through text-text-tertiary mr-1.5">₹{subtotal.toFixed(2)}</Text>}
                <Text className="text-sm font-medium text-text-primary">₹{(subtotal - discount).toFixed(2)}</Text>
              </View>
            </View>

            <View className="flex-row justify-between mb-3">
              <Text className="text-sm font-medium text-text-secondary border-b border-dashed border-text-tertiary pb-0.5">Delivery Fee | 3.0 kms</Text>
              <Text className="text-sm font-bold text-emerald-600">FREE</Text>
            </View>

            {deliveryTip > 0 && (
              <View className="flex-row justify-between mb-3">
                <Text className="text-sm font-medium text-text-secondary">Delivery Tip</Text>
                <Text className="text-sm font-medium text-text-primary">₹{deliveryTip.toFixed(2)}</Text>
              </View>
            )}

            <View className="flex-row justify-between mb-4">
              <Text className="text-sm font-medium text-text-secondary border-b border-dashed border-text-tertiary pb-0.5">GST & Other Charges</Text>
              <Text className="text-sm font-medium text-text-primary">₹{calculatedGst.toFixed(2)}</Text>
            </View>

            <View className="h-[1px] bg-border-light mb-4" />

            <View className="flex-row justify-between items-center">
              <Text className="text-base font-bold text-text-primary">To Pay</Text>
              <Text className="text-lg font-black text-text-primary">₹{finalToPay.toFixed(2)}</Text>
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
          title={placing ? 'Processing...' : 'Place Order securely'}
          onPress={placeOrder}
          disabled={placing || !selectedAddress || !selectedSlot}
          loading={placing}
          size="lg"
          fullWidth={false}
          className="flex-[1.5] shadow-md"
        />
      </Animated.View>
    </SafeAreaView>
  );
}
