import useStoreStatus from '../hooks/useStoreStatus';
import { formatDeliveryAddress } from '../utils/addressForm';
import { useConfig } from '../context/ConfigContext';
import { SERVICE_RADIUS_KM } from '../config/deliveryArea';
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  Tag,
  Clock,
  ShieldCheck,
} from '../components/icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { FreeDeliveryBanner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { computeBill, DEFAULT_TAX_PERCENT } from '../utils/pricing';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';

function getPaymentLogo(app) {
  const name = (app || '').toLowerCase();
  if (name.includes('google') || name.includes('gpay')) {
    return require('../../assets/images/gpay.webp');
  }
  if (name.includes('phonepe') || name.includes('phone pe')) {
    return require('../../assets/images/phonepe.webp');
  }
  if (name.includes('paytm')) {
    return require('../../assets/images/paytm.webp');
  }
  return require('../../assets/upi.png');
}

const DEFAULT_DELIVERY_INSTRUCTIONS = {
  landmark: '',
  gateDetails: '',
  selectedDoorOptions: ['leave_door', 'call_arrive'],
  selectedLabels: ['Leave at the door', 'Call when you arrive'],
  additionalNotes: '',
  saveForFuture: true,
  summary: 'Leave at the door · Call on arrival',
  combinedNote: 'Leave at the door; Call when you arrive',
};

export default function CheckoutScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    items,
    subtotal,
    discount,
    couponCode,
    updateQty,
    removeCoupon,
    applyCoupon,
  } = useCart();

  const [selectedAddress, setSelectedAddress] = useState(null);
  const { isOpen: storeOpen, label: storeHoursLabel } = useStoreStatus();
  const [deliveryInstructionsData, setDeliveryInstructionsData] = useState(DEFAULT_DELIVERY_INSTRUCTIONS);
  const [notes, setNotes] = useState(DEFAULT_DELIVERY_INSTRUCTIONS.combinedNote);
  const [instructions, setInstructions] = useState(DEFAULT_DELIVERY_INSTRUCTIONS.selectedLabels);
  const [deliveryTip] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);

  const [loading, setLoading] = useState(true);
  const { config, refreshConfig } = useConfig();
  const minOrderValue = config?.minOrderValue ?? 0;
  const taxPercent = config?.taxPercent ?? DEFAULT_TAX_PERCENT;
  const [defaultPayment, setDefaultPayment] = useState({ app: 'Google Pay' });
  const [idempotencyKey] = useState(() => Crypto.randomUUID());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [, addrRes] = await Promise.all([
        refreshConfig().then(data => ({ data })),
        apiClient
          .get('/auth/me')
          .then((res) => apiClient.get(`/users/${res.data.id}/addresses`))
          .catch(() => ({ data: { items: [] } })),
      ]);

      const addrList = addrRes.data?.items || [];
      setSelectedAddress((prev) => {
        const defaultAddr = addrList.find((a) => a.isDefault);
        if (defaultAddr) return defaultAddr;
        if (prev && addrList.find((a) => a.id === prev.id)) {
          return addrList.find((a) => a.id === prev.id);
        }
        return defaultAddr || addrList[0] || null;
      });


    } finally {
      setLoading(false);
    }
  }, [refreshConfig]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      AsyncStorage.getItem('@supamart_default_payment_method').then((val) => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed?.app) setDefaultPayment(parsed);
          } catch (e) {}
        }
      });
    }, [loadData])
  );

  useEffect(() => {
    setCouponInput(couponCode || '');
  }, [couponCode]);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(couponInput.trim().toUpperCase());
    } finally {
      setApplying(false);
    }
  }

  useEffect(() => {
    AsyncStorage.getItem('@supamart_delivery_instructions')
      .then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.landmark === 'Opposite the bus stop') parsed.landmark = '';
            if (parsed.gateDetails === 'Blue gate, 2nd floor') parsed.gateDetails = '';
            setDeliveryInstructionsData(parsed);
            if (Array.isArray(parsed.selectedLabels)) setInstructions(parsed.selectedLabels);
            if (parsed.combinedNote) setNotes(parsed.combinedNote);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route.params?.updatedDeliveryInstructions) {
      const data = route.params.updatedDeliveryInstructions;
      setDeliveryInstructionsData(data);
      if (Array.isArray(data.selectedLabels)) setInstructions(data.selectedLabels);
      if (data.combinedNote) setNotes(data.combinedNote);
    }
  }, [route.params?.updatedDeliveryInstructions]);

  const openDeliveryInstructions = () => {
    navigation.navigate('DeliveryInstructions', {
      returnScreen: 'Checkout',
      address: selectedAddress,
      initialInstructions: deliveryInstructionsData,
    });
  };

  const {
    deliveryFee,
    tax,
    toPay: finalToPay,
    withinRadius,
    coordinatesValid,
    distanceKm,
  } = computeBill(subtotal, discount, config?.taxPercent ?? taxPercent, config, selectedAddress);
  const configReady = Boolean(config && Array.isArray(config.deliveryTiers) && config.deliveryTiers.length > 0);
  const orderBlocked = !storeOpen || Boolean(selectedAddress) && (!configReady || !withinRadius || (minOrderValue > 0 && subtotal < minOrderValue));
  const belowMinimum = minOrderValue > 0 && subtotal < minOrderValue;

  async function placeOrder() {
    if (!selectedAddress) {
      navigation.navigate('MyAddresses');
      return;
    }
    if (!configReady) {
      Toast.show({ type: 'error', text1: 'Delivery settings are unavailable. Please retry.' });
      return;
    }
    if (!storeOpen) {
      Toast.show({ type: 'info', text1: 'The shop is closed', text2: 'Order daily from 10 AM to 11 PM. No slots or breaks.' });
      return;
    }
    if (belowMinimum) {
      Toast.show({
        type: 'error',
        text1: `Add ₹${(minOrderValue - subtotal).toFixed(2)} more to reach minimum order.`,
      });
      return;
    }
    if (!withinRadius) {
      Toast.show({
        type: 'error',
        text1: coordinatesValid ? 'Delivery is available within 5 km of our shop.' : 'Select a delivery address with a valid map location.',
      });
      return;
    }

    const finalNotes = [...instructions, notes.trim()].filter(Boolean).join('; ') + (deliveryTip > 0 ? `\n[Delivery Tip: ₹${deliveryTip}]` : '');
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
      notes: finalNotes,
      paymentMethod: 'UPI_MANUAL',
      deliveryTip,
    };

    navigation.navigate('Payment', { payload, idempotencyKey, amount: finalToPay });
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
          >
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
          </Pressable>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, fontWeight: 'normal', color: '#0f172a' }}>
            Checkout
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={{ fontFamily: fonts.semiBold, marginTop: 12, fontSize: 14, fontWeight: 'normal', color: '#64748b' }}>
            Preparing checkout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!items?.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Pressable
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Home' }))}
            hitSlop={10}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
          </Pressable>
        </View>
        <EmptyState
          icon="cart"
          message="Your cart is empty"
          onRetry={() => navigation.navigate('Main', { screen: 'Home' })}
          buttonText="Keep Shopping"
        />
      </SafeAreaView>
    );
  }

  const paymentAppLabel = defaultPayment?.app || 'Google Pay';
  const paymentLogo = getPaymentLogo(paymentAppLabel);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
        </Pressable>
        <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, fontWeight: 'normal', color: '#0f172a', letterSpacing: -0.3 }}>
          Checkout
        </Text>
      </View>

      {/* SAVINGS TICKER IF COUPON APPLIED */}
      {discount > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{
            backgroundColor: '#ecfdf5',
            paddingVertical: 9,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderColor: '#a7f3d0',
          }}
        >
          <Text style={{ fontFamily: fonts.bold, color: '#047857', fontWeight: 'normal', fontSize: 13 }}>
            {`₹${discount} saved with '${couponCode}'`}
          </Text>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 110,
          gap: 14,
        }}
      >
        {/* 1. DELIVERING TO ADDRESS CARD */}
        <Animated.View entering={FadeInUp.duration(320)}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 12 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: '#ecfdf5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    marginTop: 1,
                  }}
                >
                  <MapPin size={18} color="#047857" strokeWidth={2.4} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#0f172a' }}>
                    {selectedAddress?.label && selectedAddress.label !== 'Current Location' ? `Delivering to ${selectedAddress.label}` : 'Delivery address'}
                  </Text>
                  <Text
                    style={{ fontFamily: fonts.regular, fontSize: 12.5, color: '#64748b', marginTop: 2, lineHeight: 18 }}
                    numberOfLines={2}
                  >
                    {selectedAddress
                      ? formatDeliveryAddress(selectedAddress)
                      : 'No delivery address selected'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => navigation.navigate('MyAddresses')}
                hitSlop={8}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: '#f0fdf4',
                  borderWidth: 1,
                  borderColor: '#bbf7d0',
                  alignSelf: 'flex-start',
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, color: '#047857' }}>
                  {selectedAddress ? 'Change' : 'Select'}
                </Text>
              </Pressable>
            </View>

            {/* ETA & Store Hours Info Row - neatly organized with badge, never truncated */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderColor: '#f1f5f9',
                rowGap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                <Clock size={14} color="#059669" strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text
                  style={{
                    fontFamily: fonts.semiBold,
                    fontSize: 12,
                    color: '#047857',
                  }}
                >
                  Delivery estimate after ordering
                </Text>
              </View>

              {storeHoursLabel ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: storeOpen ? '#ecfdf5' : '#fef2f2',
                    paddingHorizontal: 8,
                    paddingVertical: 3.5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: storeOpen ? '#a7f3d0' : '#fecaca',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 11,
                      color: storeOpen ? '#047857' : '#b91c1c',
                    }}
                  >
                    {storeOpen ? 'Open until 11 PM' : 'Closed · Opens 10 AM'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* 2. CART ITEMS SUMMARY CARD */}
        <Animated.View entering={FadeInUp.duration(340).delay(60)}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: '#0f172a' }}>
                Items in cart ({items.length})
              </Text>
              <Pressable onPress={() => navigation.navigate('Cart')}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, fontWeight: 'normal', color: '#047857' }}>
                  Edit cart
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: 14 }}>
              {items.map((item, idx) => {
                const imgSource =
                  getProductImageSource(item) ||
                  (item.image ? { uri: optimizeCloudinaryUrl(item.image, 200) } : null);

                return (
                  <View
                    key={`${item.productId}-${item.variantId || idx}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Thumbnail */}
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      {imgSource ? (
                        <Image source={imgSource} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                      ) : (
                        <ShoppingBag size={20} color="#94a3b8" />
                      )}
                    </View>

                    {/* Details */}
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontFamily: fonts.semiBold, fontSize: 13.5, fontWeight: 'normal', color: '#0f172a' }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 12, fontWeight: 'normal', color: '#64748b', marginTop: 1 }}>
                        {item.variantLabel || '1 unit'} · ₹{(item.price ?? 0).toFixed(0)}
                      </Text>
                    </View>

                    {/* Stepper buttons */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#047857',
                        overflow: 'hidden',
                      }}
                    >
                      <Pressable
                        onPress={() => updateQty(item.productId, item.variantId, -1)}
                        hitSlop={4}
                        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={13} color="#047857" strokeWidth={3} />
                      </Pressable>
                      <Text style={{ fontFamily: fonts.bold, width: 24, textAlign: 'center', fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>
                        {item.qty}
                      </Text>
                      <Pressable
                        onPress={() => updateQty(item.productId, item.variantId, 1)}
                        hitSlop={4}
                        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={13} color="#047857" strokeWidth={3} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* 2.5 DELIVERY INSTRUCTIONS CARD */}
        <Animated.View entering={FadeInUp.duration(340).delay(80)}>
          <Pressable
            onPress={openDeliveryInstructions}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: deliveryInstructionsData?.summary || deliveryInstructionsData?.landmark ? 10 : 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <DoorClosed size={18} color="#047857" strokeWidth={2.4} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: '#0f172a' }}>
                  Delivery instructions
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#047857' }}>
                  {deliveryInstructionsData?.selectedDoorOptions?.length > 0 || deliveryInstructionsData?.landmark ? 'Edit' : 'Add'}
                </Text>
                <ChevronRight size={16} color="#047857" strokeWidth={2.4} />
              </View>
            </View>

            {deliveryInstructionsData?.summary ? (
              <View
                style={{
                  backgroundColor: '#ecfdf5',
                  borderWidth: 1,
                  borderColor: '#a7f3d0',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 10.5, color: '#047857', letterSpacing: 0.4, marginBottom: 2 }}>
                  YOUR DELIVERY PARTNER WILL SEE
                </Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, color: '#166534' }}>
                  {deliveryInstructionsData.summary}
                </Text>
              </View>
            ) : null}

            {(deliveryInstructionsData?.landmark || deliveryInstructionsData?.gateDetails) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {deliveryInstructionsData?.landmark ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <MapPin size={12} color="#059669" strokeWidth={2.4} style={{ marginRight: 5 }} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: '#334155' }}>
                      {deliveryInstructionsData.landmark}
                    </Text>
                  </View>
                ) : null}

                {deliveryInstructionsData?.gateDetails ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <DoorClosed size={12} color="#059669" strokeWidth={2.4} style={{ marginRight: 5 }} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: '#334155' }}>
                      {deliveryInstructionsData.gateDetails}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {!deliveryInstructionsData?.summary && !deliveryInstructionsData?.landmark && (
              <Text style={{ fontFamily: fonts.regular, fontSize: 12.5, color: '#94a3b8' }}>
                No delivery instructions added · Tap to customize
              </Text>
            )}
          </Pressable>
        </Animated.View>
        {/* 3. APPLY COUPON CARD */}
        <Animated.View entering={FadeInUp.duration(340).delay(100)}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <Tag size={18} color="#047857" strokeWidth={2.4} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: '#0f172a' }}>
                Coupons & offers
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                placeholder="Enter coupon code"
                placeholderTextColor="#94a3b8"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
                editable={!couponCode}
                style={{
                  flex: 1,
                  height: 46,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: couponCode ? '#a7f3d0' : '#e2e8f0',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  fontFamily: fonts.bold,
                  fontSize: 13.5,
                  fontWeight: 'normal',
                  color: '#0f172a',
                }}
              />
              <Pressable
                onPress={couponCode ? removeCoupon : handleApplyCoupon}
                disabled={applying || (!couponCode && !couponInput.trim())}
                style={{
                  height: 46,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  backgroundColor: couponCode ? '#ffffff' : '#047857',
                  borderWidth: couponCode ? 1.5 : 0,
                  borderColor: '#ef4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (!couponCode && !couponInput.trim()) ? 0.6 : 1,
                }}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13.5,
                      fontWeight: 'normal',
                      color: couponCode ? '#ef4444' : '#ffffff',
                    }}
                  >
                    {couponCode ? 'Remove' : 'Apply'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* 4. FREE DELIVERY NUDGE */}
        <Animated.View entering={FadeInUp.duration(340).delay(130)}>
          <FreeDeliveryBanner subtotal={subtotal} />
        </Animated.View>

        {/* 5. BILL DETAILS CARD */}
        <Animated.View entering={FadeInUp.duration(340).delay(160)}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 18,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 15, fontWeight: 'normal', color: '#0f172a', marginBottom: 16 }}>
              Bill Details
            </Text>

            <View style={{ gap: 11 }}>
              {/* Item Total */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, fontWeight: 'normal', color: '#64748b' }}>
                  Item Total (MRP)
                </Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, fontWeight: 'normal', color: '#0f172a' }}>
                  ₹{subtotal.toFixed(2)}
                </Text>
              </View>

              {/* Discount */}
              {discount > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.semiBold, fontSize: 13.5, fontWeight: 'normal', color: '#047857' }}>
                    Coupon Discount
                  </Text>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, fontWeight: 'normal', color: '#047857' }}>
                    -₹{discount.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* GST */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, fontWeight: 'normal', color: '#64748b' }}>
                  GST ({config?.taxPercent ?? taxPercent}%)
                </Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, fontWeight: 'normal', color: '#0f172a' }}>
                  ₹{tax.toFixed(2)}
                </Text>
              </View>

              {/* Delivery Fee */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 13.5, fontWeight: 'normal', color: '#64748b' }}>
                  Delivery Fee
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 13.5,
                    fontWeight: 'normal',
                    color: deliveryFee === 0 ? '#047857' : '#0f172a',
                  }}
                >
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                </Text>
              </View>

              {/* Dotted separator */}
              <View
                style={{
                  borderBottomWidth: 1,
                  borderColor: '#e2e8f0',
                  borderStyle: 'dashed',
                  marginVertical: 4,
                }}
              />

              {/* Total to pay */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 15.5, fontWeight: 'normal', color: '#0f172a' }}>
                  Total to Pay
                </Text>
                <Text style={{ fontFamily: fonts.black, fontSize: 18, fontWeight: 'normal', color: '#047857' }}>
                  ₹{finalToPay.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* 6. WARNINGS (MINIMUM ORDER / SERVICE RADIUS) */}
        {belowMinimum && (
          <Animated.View
            entering={FadeInUp.duration(340).delay(180)}
            style={{
              padding: 14,
              backgroundColor: '#fffbeb',
              borderWidth: 1,
              borderColor: '#fde68a',
              borderRadius: 16,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, fontWeight: 'normal', color: '#92400e' }}>
              Add ₹{(minOrderValue - subtotal).toFixed(2)} more to place this order
            </Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, fontWeight: 'normal', color: '#b45309', marginTop: 2 }}>
              Minimum order value is ₹{minOrderValue}
            </Text>
          </Animated.View>
        )}

        {!configReady && (
          <View style={{ padding: 16, gap: 8 }}>
            <Text>Delivery settings could not be loaded.</Text>
            <Pressable onPress={loadData} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: '#0A7C47', fontFamily: fonts.semiBold }}>Try again</Text>
            </Pressable>
          </View>
        )}
        {selectedAddress && !withinRadius && (
          <Animated.View
            entering={FadeInUp.duration(340).delay(180)}
            style={{
              padding: 14,
              backgroundColor: '#fef2f2',
              borderWidth: 1,
              borderColor: '#fecaca',
              borderRadius: 16,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, fontWeight: 'normal', color: '#991b1b' }}>
              Delivery currently unavailable in your area
            </Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, fontWeight: 'normal', color: '#b91c1c', marginTop: 2 }}>
              {coordinatesValid ? `Your saved pin is ${distanceKm?.toFixed(2)} km from the shop, outside our ${SERVICE_RADIUS_KM} km delivery radius. Addresses exactly ${SERVICE_RADIUS_KM} km away are included.` : 'This address needs a valid map location. Please update the address before ordering.'}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('AddAddress', { address: selectedAddress })} style={{ paddingVertical: 12 }}><Text style={{ color: '#047857', fontFamily: fonts.bold }}>Update this address and GPS pin</Text></Pressable>
          </Animated.View>
        )}

        {/* 7. PAYMENT METHOD CARD WITH DYNAMIC UPI LOGO */}
        <Animated.View entering={FadeInUp.duration(340).delay(200)}>
          <Pressable onPress={() => navigation.navigate('Payment')}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              {/* Dynamic Payment App Logo */}
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  padding: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Image
                  source={paymentLogo}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>

              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, fontWeight: 'normal', color: '#0f172a' }}>
                  Pay via {paymentAppLabel}
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                  {paymentAppLabel} is set as default · Tap to change
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: '#f0fdf4',
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, fontWeight: 'normal', color: '#047857' }}>
                  Change
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* 8. CANCELLATION POLICY */}
        <Animated.View entering={FadeInUp.duration(340).delay(220)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              gap: 10,
            }}
          >
            <ShieldCheck size={18} color="#64748b" strokeWidth={2.2} />
            <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 12, color: '#64748b', lineHeight: 18, fontWeight: 'normal' }}>
              Orders are prepared fresh and dispatched promptly. For any issue or return, request a refund directly in the app.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* STICKY BOTTOM CHECKOUT ACTION BAR */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 6,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, fontWeight: 'normal', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Total to pay
          </Text>
          <Text style={{ fontFamily: fonts.black, fontSize: 22, fontWeight: 'normal', color: '#0f172a' }}>
            ₹{finalToPay.toFixed(2)}
          </Text>
        </View>

        <Pressable
          onPress={placeOrder}
          disabled={orderBlocked}
          style={{
            minWidth: 180,
            height: 50,
            borderRadius: 16,
            backgroundColor: (orderBlocked) ? '#94a3b8' : '#047857',
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: (orderBlocked) ? 'transparent' : '#047857',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, fontWeight: 'normal', color: '#ffffff' }}>
            {!storeOpen
              ? 'Closed · Opens 10 AM'
              : !selectedAddress
              ? 'Select Address'
              : !configReady
              ? 'Delivery Settings Unavailable'
              : !coordinatesValid
              ? 'Update Address Location'
              : !withinRadius
              ? 'Out of Delivery Area'
              : belowMinimum
              ? `Add ₹${(minOrderValue - subtotal).toFixed(0)} more`
              : `Proceed to Pay`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
