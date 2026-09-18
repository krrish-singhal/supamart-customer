import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, Pressable, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { MapPin, Minus, Plus, Sparkles, ShoppingBag, Smartphone } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Crypto from 'expo-crypto';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { Header, Card, Button, Input, Skeleton, FreeDeliveryBanner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { computeBill, DEFAULT_TAX_PERCENT } from '../utils/pricing';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';

export default function CheckoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    items, subtotal, discount, couponCode,
    updateQty, removeCoupon, applyCoupon,
  } = useCart();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes] = useState('');
  const [deliveryTip] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [minOrderValue, setMinOrderValue] = useState(0);
  const [taxPercent, setTaxPercent] = useState(DEFAULT_TAX_PERCENT);
  // One idempotency key per checkout attempt — reused across retries and by
  // PaymentScreen's deferred order-creation call — so a flaky retry or double-tap
  // can't create two orders / double-decrement stock.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, addrRes] = await Promise.all([
        apiClient.get('/config'),
        apiClient.get('/auth/me').then(res => apiClient.get(`/users/${res.data.id}/addresses`)).catch(() => ({ data: { items: [] } })),
      ]);
      const addrList = addrRes.data.items || [];
      setSelectedAddress(prev => {
        // Always respect the default address from the backend first
        const defaultAddr = addrList.find(a => a.isDefault);
        if (defaultAddr) return defaultAddr;
        
        // If no default, fallback to previously selected if it still exists
        if (prev && addrList.find(a => a.id === prev.id)) {
          return addrList.find(a => a.id === prev.id);
        }
        
        // Otherwise, pick the most recently added address
        return addrList[addrList.length - 1] || null;
      });

      const activeSlots = (configRes.data.slots || []).filter((s) => s.active);
      setSelectedSlot(activeSlots[0] || { label: 'ASAP (Within 45 mins)', from: 0, to: 0 });
      setConfig(configRes.data);
      setMinOrderValue(configRes.data.minOrderValue || 0);
      setTaxPercent(configRes.data.taxPercent ?? DEFAULT_TAX_PERCENT);
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
    if (minOrderValue > 0 && subtotal < minOrderValue) {
      Toast.show({ type: 'error', text1: `Add ₹${(minOrderValue - subtotal).toFixed(2)} more to reach the ₹${minOrderValue} minimum order.` });
      return;
    }
    const finalNotes = notes + (deliveryTip > 0 ? `\n[Delivery Tip: ₹${deliveryTip}]` : '');
    const payload = {
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
      paymentMethod: 'UPI_MANUAL',
      deliveryTip,
    };

    // No order yet — hand the payload to PaymentScreen, which only creates the order
    // once the customer has actually completed a payment action.
    navigation.navigate('Payment', { payload, idempotencyKey, amount: finalToPay });
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

  const { deliveryFee, tax, toPay: finalToPay, withinRadius } = computeBill(subtotal, discount, taxPercent, config, selectedAddress);
  const belowMinimum = minOrderValue > 0 && subtotal < minOrderValue;

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Checkout" onBack={() => navigation.goBack()} />

      {discount > 0 && (
        <Animated.View entering={FadeInDown.duration(400)} className="bg-emerald-50 px-4 py-2.5 flex-row items-center justify-center border-b border-emerald-100 shadow-sm">
          <Sparkles size={16} color="#10b981" />
          <Text className="text-emerald-700 font-bold ml-2">₹{discount} Saved with &apos;{couponCode}&apos;</Text>
        </Animated.View>
      )}

      <ScrollView
        className="flex-1"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
        showsVerticalScrollIndicator={false}
      >

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
          <Card className="mx-4 mb-4 p-4 bg-white border border-border-light rounded-2xl" elevation="sm">
            {items.map((item, index) => (
              <View key={`${item.productId}-${item.variantId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: index !== items.length - 1 ? 20 : 0 }}>
                <View style={{ width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4, overflow: 'hidden' }}>
                  {(getProductImageSource(item) || item.image) ? (
                    <Image source={getProductImageSource(item) || { uri: optimizeCloudinaryUrl(item.image, 200) }} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" />
                  ) : (
                    <ShoppingBag size={24} color="#cbd5e1" />
                  )}
                </View>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 }} numberOfLines={2}>{item.name} ({item.variantLabel})</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>₹{(item.price ?? 0).toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1.5, borderColor: '#16a34a', overflow: 'hidden' }}>
                  <Pressable onPress={() => updateQty(item.productId, item.variantId, -1)} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={14} color="#16a34a" strokeWidth={3} />
                  </Pressable>
                  <Text style={{ width: 26, textAlign: 'center', fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{item.qty}</Text>
                  <Pressable onPress={() => updateQty(item.productId, item.variantId, 1)} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={14} color="#16a34a" strokeWidth={3} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Apply Coupon */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)}>
          <Card className="mx-4 mb-4 p-4 bg-white border border-border-light rounded-2xl" elevation="sm">
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>Apply Coupon</Text>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Input
                containerStyle={{ flex: 1, marginBottom: 0 }}
                style={{ height: 46, borderRadius: 10 }}
                placeholder="Enter coupon code"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
                editable={!couponCode}
              />
              <Button
                title={couponCode ? 'Remove' : 'Apply'}
                onPress={couponCode ? removeCoupon : handleApplyCoupon}
                loading={applying}
                disabled={applying || (!couponCode && !couponInput.trim())}
                variant={couponCode ? 'outline' : 'primary'}
                fullWidth={false}
                style={{ height: 46, paddingHorizontal: 20, borderRadius: 10 }}
                textStyle={{ fontSize: 13 }}
              />
            </View>
            {discount > 0 && (
              <View className="flex-row items-center justify-between mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <Text className="text-sm font-bold text-text-primary">₹{discount} saved with &apos;{couponCode}&apos;!</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Free delivery nudge */}
        <Animated.View entering={FadeInUp.duration(400).delay(230)} className="mx-4 mb-4">
          <FreeDeliveryBanner subtotal={subtotal} />
        </Animated.View>

        {/* Bill Details */}
        <Animated.View entering={FadeInUp.duration(400).delay(250)}>
          <Card className="mx-4 mb-4 p-5 bg-white border border-border-light rounded-2xl" elevation="sm">
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 16 }}>Bill Details</Text>

            <View className="flex-row justify-between mb-3">
              <Text className="text-sm font-medium text-text-secondary">Item Total (MRP)</Text>
              <Text className="text-sm font-medium text-text-primary">₹{subtotal.toFixed(2)}</Text>
            </View>

            {discount > 0 && (
              <View className="flex-row justify-between mb-3">
                <Text className="text-sm font-medium text-emerald-600">Coupon Discount</Text>
                <Text className="text-sm font-medium text-emerald-600">-₹{discount.toFixed(2)}</Text>
              </View>
            )}

            <View className="flex-row justify-between mb-3">
              <Text className="text-sm font-medium text-text-secondary">GST ({taxPercent}%)</Text>
              <Text className="text-sm font-medium text-text-primary">₹{tax.toFixed(2)}</Text>
            </View>

            <View className="flex-row justify-between mb-4">
              <Text className="text-sm font-medium text-text-secondary">Delivery Fee</Text>
              <Text className={`text-sm font-medium ${deliveryFee === 0 ? 'text-emerald-600 font-bold' : 'text-text-primary'}`}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
              </Text>
            </View>

            <View className="h-[1px] bg-border-light mb-4" />

            <View className="flex-row justify-between items-center">
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#16a34a' }}>Total to Pay</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#16a34a' }}>₹{finalToPay.toFixed(2)}</Text>
            </View>
          </Card>
        </Animated.View>

        {belowMinimum && (
          <Animated.View entering={FadeInUp.duration(400).delay(255)} className="mx-4 mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <Text className="text-sm font-bold text-amber-800">
              Add ₹{(minOrderValue - subtotal).toFixed(2)} more to place this order
            </Text>
            <Text className="text-xs font-medium text-amber-700 mt-0.5">
              Minimum order value is ₹{minOrderValue}
            </Text>
          </Animated.View>
        )}

        {(!withinRadius) && (
          <Animated.View entering={FadeInUp.duration(400).delay(255)} className="mx-4 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
            <Text className="text-sm font-bold text-red-800">
              Delivery currently unavailable in your area.
            </Text>
            <Text className="text-xs font-medium text-red-700 mt-0.5">
              Your selected address is outside our {(config?.serviceRadiusKm || 5)} KM delivery radius.
            </Text>
          </Animated.View>
        )}

        {/* Payment */}
        <Animated.View entering={FadeInUp.duration(400).delay(280)}>
          <Card className="mx-4 mb-4 p-4 bg-white border border-border-light rounded-2xl flex-row items-center" elevation="sm">
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Smartphone size={18} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>Pay Online</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Scan QR or pay with Google Pay — on the next screen</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Cancellation Policy */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} className="px-6 mb-6">
          <Text className="text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">Cancellation Policy</Text>
          <Text className="text-xs font-medium text-text-tertiary leading-5">Please double-check your order and address details. Orders are non-refundable once placed.</Text>
        </Animated.View>

        {/* Pay CTA — part of the normal page flow, right where the content ends */}
        <Animated.View entering={FadeInUp.duration(400).delay(350)} className="px-4">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total To Pay</Text>
            <Text className="text-2xl font-black text-text-primary">₹{finalToPay.toFixed(2)}</Text>
          </View>
          <Button
            title={!withinRadius ? 'Out of Delivery Area' : belowMinimum ? `Add ₹${(minOrderValue - subtotal).toFixed(2)} more` : `Proceed to Pay ₹${finalToPay.toFixed(2)}`}
            onPress={placeOrder}
            disabled={!selectedAddress || !selectedSlot || belowMinimum || !withinRadius}
            style={{ backgroundColor: (!withinRadius) ? '#94a3b8' : '#16a34a', height: 52, borderRadius: 12 }}
            textStyle={{ fontWeight: '800', fontSize: 16 }}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
