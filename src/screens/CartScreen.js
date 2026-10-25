import { formatDeliveryAddress } from '../utils/addressForm';
import { useConfig } from '../context/ConfigContext';
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
  TextInput,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Truck,
  Clock,
  Plus,
  Minus,
  Tag,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from '../components/icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, limit, getDocs, where, onSnapshot } from '../services/reads';
import { db } from '../config/firebase';
import { Skeleton } from '../components/ui';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { computeBill } from '../utils/pricing';
import apiClient from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { getCategoryVisual } from '../utils/categoryImages';
import { fonts } from '../theme/typography';

function getPaymentLogo(app) {
  const norm = (app || '').toLowerCase();
  if (norm.includes('google') || norm.includes('gpay')) {
    return require('../../assets/images/gpay.webp');
  }
  if (norm.includes('phonepe') || norm.includes('phone pe')) {
    return require('../../assets/images/phonepe.webp');
  }
  if (norm.includes('paytm')) {
    return require('../../assets/images/paytm.webp');
  }
  return require('../../assets/upi.png');
}

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userProfile: user } = useContext(AuthContext);
  const {
    items,
    subtotal,
    discount,
    couponCode,
    loading,
    addItem,
    updateQty,
    applyCoupon,
    removeCoupon,
    loadCart,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const rawProductsRef = useRef([]);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const { config: deliveryConfig, refreshConfig } = useConfig();
  const taxPercent = deliveryConfig?.taxPercent;
  const [popularProducts, setPopularProducts] = useState([]);
  const [emptyCategories, setEmptyCategories] = useState([]);
  const [defaultPayment, setDefaultPayment] = useState({ app: 'UPI app' });

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@supamart_default_payment_method')
        .then((data) => {
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed?.app) setDefaultPayment(parsed);
            } catch {}
          }
        })
        .catch(() => {});
    }, [])
  );

  // Fetch categories and popular products for empty state
  useEffect(() => {
    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), where('isActive', '==', true)),
      (snap) => {
        const topLevel = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.parentId);
        setEmptyCategories(topLevel.sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8));
      },
      () => {}
    );
    const unsubPop = onSnapshot(
      query(collection(db, 'products'), limit(8)),
      (snap) => {
        setPopularProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );
    return () => {
      unsubCats();
      unsubPop();
    };
  }, []);

  // Fetch default address
  useFocusEffect(useCallback(() => {
    refreshConfig();
    if (!user?.id) return;
    let active = true;
    apiClient
      .get(`/users/${user.id}/addresses`, { __skipErrorToast: true })
      .then(({ data }) => {
        const addrs = data.items || [];
        const def = addrs.find((a) => a.isDefault) || addrs[0] || null;
        if (active) setDefaultAddress(def);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.id, refreshConfig]));

  // Fetch quick add recommendations for "Did you forget?" section
  useEffect(() => {
    let isMounted = true;
    const fetchRecs = async () => {
      try {
        if (!rawProductsRef.current || rawProductsRef.current.length === 0) {
          const q = query(collection(db, 'products'), limit(15));
          const snap = await getDocs(q);
          if (isMounted) {
            rawProductsRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        }
        if (isMounted) {
          const inCartIds = new Set(items.map((i) => i.productId));
          const unadded = (rawProductsRef.current || []).filter((p) => !inCartIds.has(p.id));
          setRecommendations(unadded.slice(0, 8));
          setLoadingRecs(false);
        }
      } catch {
        if (isMounted) setLoadingRecs(false);
      }
    };
    fetchRecs();
    return () => {
      isMounted = false;
    };
  }, [items.length]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadCart(true);
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [loadCart, handleBack])
  );

  // Compute bill
  const { deliveryFee, toPay } = computeBill(subtotal, discount, taxPercent, deliveryConfig, defaultAddress);

  // Calculate total MRP savings
  const totalMrp = items.reduce((sum, item) => {
    const mrp = item.price || item.offerPrice || 0;
    return sum + mrp * (item.qty || 1);
  }, 0);
  const savings = Math.max(0, Math.round(totalMrp - subtotal + (deliveryFee === 0 ? 30 : 0)));

  if (loading && !items.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Header Skeleton */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 14,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width={110} height={20} borderRadius={6} style={{ marginBottom: 4 }} />
            <Skeleton width={180} height={12} borderRadius={4} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Savings / Delivery banner skeleton */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' }}>
            <Skeleton width={38} height={38} borderRadius={19} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="65%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
              <Skeleton width="45%" height={12} borderRadius={4} />
            </View>
          </View>

          {/* Cart Items Card skeleton */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Skeleton width={100} height={16} borderRadius={4} />
              <Skeleton width={45} height={14} borderRadius={4} />
            </View>
            {[1, 2].map((idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: idx === 1 ? 1 : 0, borderColor: '#f8fafc' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Skeleton width={52} height={52} borderRadius={12} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="40%" height={12} borderRadius={4} />
                  </View>
                </View>
                <Skeleton width={70} height={32} borderRadius={10} style={{ marginRight: 12 }} />
                <Skeleton width={45} height={18} borderRadius={4} />
              </View>
            ))}
          </View>

          {/* Did you forget horizontal skeleton */}
          <View>
            <Skeleton width={130} height={18} borderRadius={4} style={{ marginBottom: 12, marginLeft: 2 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {[1, 2, 3].map((idx) => (
                <View key={idx} style={{ width: 124, backgroundColor: '#ffffff', borderRadius: 18, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <Skeleton width="100%" height={94} borderRadius={12} style={{ marginBottom: 8 }} />
                  <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="50%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={36} height={16} borderRadius={4} />
                    <Skeleton width={30} height={30} borderRadius={8} />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Bill summary skeleton */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 14 }} />
            <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
            <Skeleton width="100%" height={18} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!items.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 20, fontWeight: 'normal', color: '#0f172a', marginLeft: 6 }}>
            Your cart
          </Text>
        </View>

        {/* Empty State matching Image 5 */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 28, paddingHorizontal: 24 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: '#e6f4ea',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <ShoppingBag size={44} color="#047857" strokeWidth={2} />
            </View>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 22, fontWeight: 'normal', color: '#0f172a', marginBottom: 6 }}>
              Your cart is empty
            </Text>
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 13.5,
                fontWeight: 'normal',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 20,
                maxWidth: 280,
                marginBottom: 20,
              }}
            >
              Add daily essentials and we&apos;ll deliver them to your door in minutes.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              style={{
                backgroundColor: '#047857',
                borderRadius: 14,
                paddingHorizontal: 28,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, fontWeight: 'normal', color: '#ffffff' }}>
                Start shopping
              </Text>
            </Pressable>
          </View>

          {/* Section: Popular right now matching Image 5 */}
          {popularProducts.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 16.5,
                  fontWeight: 'normal',
                  color: '#0f172a',
                  paddingHorizontal: 18,
                  marginBottom: 12,
                }}
              >
                Popular right now
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
              >
                {popularProducts.map((prod) => {
                  const imgSource =
                    getProductImageSource(prod, 200) || { uri: optimizeCloudinaryUrl(prod.image, 200) };
                  const price =
                    prod.variants?.[0]?.offerPrice ?? prod.variants?.[0]?.price ?? prod.price ?? 0;
                  const packSize =
                    prod.variants?.[0]?.label || prod.unit || 'Standard pack';

                  return (
                    <View
                      key={prod.id}
                      style={{
                        width: 128,
                        backgroundColor: '#ffffff',
                        borderRadius: 18,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      <Pressable
                        onPress={() => navigation.navigate('ProductDetail', { id: prod.id })}
                        style={{
                          width: '100%',
                          height: 104,
                          borderRadius: 14,
                          backgroundColor: '#f8fafc',
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Image
                          source={imgSource}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                      </Pressable>

                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}
                      >
                        {prod.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 11.5, fontWeight: '500', color: '#64748b', marginTop: 1, marginBottom: 8 }}
                      >
                        {packSize}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0f172a' }}>
                          ₹{price}
                        </Text>
                        <Pressable
                          onPress={() => addItem(prod, prod.variants?.[0])}
                          hitSlop={6}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: '#059669',
                            backgroundColor: '#ffffff',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={15} color="#059669" strokeWidth={3} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Section: Shop by category matching Image 5 */}
          {emptyCategories.length > 0 && (
            <View>
              <Text
                style={{
                  fontSize: 16.5,
                  fontWeight: '800',
                  color: '#0f172a',
                  paddingHorizontal: 18,
                  marginBottom: 12,
                }}
              >
                Shop by category
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}
              >
                {emptyCategories.map((cat) => {
                  const catVisual = getCategoryVisual(cat);
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => navigation.navigate('Category', { id: cat.id, name: cat.name })}
                      style={{ alignItems: 'center', width: 76 }}
                    >
                      <View
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 20,
                          backgroundColor: '#f8fafc',
                          borderWidth: 1,
                          borderColor: '#f1f5f9',
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 6,
                        }}
                      >
                        {catVisual ? (
                          <Image
                            source={typeof catVisual === 'number' ? catVisual : catVisual}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="contain"
                          />
                        ) : (
                          <ShoppingBag size={28} color="#64748b" />
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const addressSubtitle = defaultAddress ? `Delivering to ${formatDeliveryAddress(defaultAddress)}` : 'Select a delivery address';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header matching Image 1 & 2 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 20, fontWeight: 'normal', color: '#0f172a', letterSpacing: -0.4 }}>
            Your cart
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.regular, fontSize: 12.5, fontWeight: 'normal', color: '#64748b', marginTop: 1 }}
          >
            {addressSubtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 12) + 124,
        }}
      >
        {/* Savings banner matching Image 1 & 2 */}
        <Animated.View
          entering={FadeInDown.duration(350)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 5,
            elevation: 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#ecfdf5',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Truck size={17} color="#047857" strokeWidth={2.4} />
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, fontWeight: 'normal', color: '#334155', flex: 1 }}>
              {deliveryFee === 0 ? (
                savings > 0 ? (
                  <>
                    <Text style={{ fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857' }}>₹{savings} saved!</Text> Free delivery applied
                  </>
                ) : (
                  <Text style={{ fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857' }}>Free delivery applied to your order!</Text>
                )
              ) : (
                savings > 0 ? (
                  <>
                    <Text style={{ fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857' }}>₹{savings} saved</Text> on this order!
                  </>
                ) : (
                  <Text style={{ fontFamily: fonts.semiBold, fontWeight: 'normal', color: '#334155' }}>
                    Delivery to your <Text style={{ fontFamily: fonts.extraBold, color: '#047857', fontWeight: 'normal' }}>saved address</Text>
                  </Text>
                )
              )}
            </Text>
          </View>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#047857',
              width: '100%',
            }}
          />
        </Animated.View>

        {/* Cart Items List Card matching Image 1 & 2 */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(60)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          {/* Arrival Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={16} color="#047857" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 14.5, fontWeight: 'normal', color: '#0f172a' }}>
                Delivery estimate appears after ordering
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {/* Items List with Clean Layout & No Ellipsis */}
          <View>
            {items.map((item, index) => {
              const imageSrc = getProductImageSource(item, 200);
              const price = item.offerPrice ?? item.price ?? 0;
              const mrp = item.price ?? 0;
              const hasDiscount = mrp > price;
              const isLast = index === items.length - 1;

              return (
                <View
                  key={`${item.productId}-${item.variantId}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderColor: '#f8fafc',
                  }}
                >
                  {/* Left: Thumbnail & Details */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        backgroundColor: '#f8fafc',
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        padding: 2,
                      }}
                    >
                      {imageSrc ? (
                        <Image source={imageSrc} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                      ) : (
                        <ShoppingBag size={22} color="#cbd5e1" />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={2}
                        style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: '#0f172a', lineHeight: 18 }}
                      >
                        {item.name}
                      </Text>
                      <Text style={{ fontFamily: fonts.medium, fontSize: 12, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                        {item.variantLabel || item.unit || '1 Unit'}
                      </Text>
                    </View>
                  </View>

                  {/* Middle: Stepper Capsule matching Image 1 & 2 */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#047857',
                      borderRadius: 10,
                      height: 32,
                      paddingHorizontal: 4,
                      marginRight: 12,
                    }}
                  >
                    <Pressable
                      onPress={() => updateQty(item.productId, item.variantId, -1)}
                      hitSlop={8}
                      style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={13} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                    <Text
                      style={{
                        fontFamily: fonts.black,
                        fontSize: 13.5,
                        fontWeight: 'normal',
                        color: '#ffffff',
                        paddingHorizontal: 4,
                        minWidth: 18,
                        textAlign: 'center',
                      }}
                    >
                      {item.qty}
                    </Text>
                    <Pressable
                      onPress={() => updateQty(item.productId, item.variantId, 1)}
                      hitSlop={8}
                      style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={13} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                  </View>

                  {/* Right: Price & MRP */}
                  <View style={{ alignItems: 'flex-end', minWidth: 50 }}>
                    <Text style={{ fontFamily: fonts.black, fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
                      ₹{price * item.qty}
                    </Text>
                    {hasDiscount && (
                      <Text
                        style={{
                          fontFamily: fonts.regular,
                          fontSize: 11.5,
                          fontWeight: 'normal',
                          color: '#94a3b8',
                          textDecorationLine: 'line-through',
                          marginTop: 1,
                        }}
                      >
                        ₹{mrp * item.qty}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* "Did you forget?" Section matching Image 1 & 2 - Stable skeleton prevents UI glitch / jump */}
        {(loadingRecs || recommendations.length > 0) && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontFamily: fonts.extraBold,
                  fontWeight: 'normal',
                  color: '#0f172a',
                  letterSpacing: -0.3,
                }}
              >
                Did you forget?
              </Text>
            </View>

            {loadingRecs ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {[1, 2, 3, 4].map((k) => (
                  <View
                    key={k}
                    style={{
                      width: 124,
                      backgroundColor: '#ffffff',
                      borderRadius: 18,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: '#f1f5f9',
                    }}
                  >
                    <Skeleton width="100%" height={94} borderRadius={12} style={{ marginBottom: 8 }} />
                    <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="50%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Skeleton width={36} height={16} borderRadius={4} />
                      <Skeleton width={30} height={30} borderRadius={8} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {recommendations.map((rec) => {
                  const recImg = getProductImageSource(rec, 200);
                  const recPrice = rec.variants?.[0]?.offerPrice ?? rec.variants?.[0]?.price ?? rec.price ?? 0;

                  return (
                    <View
                      key={rec.id}
                      style={{
                        width: 124,
                        backgroundColor: '#ffffff',
                        borderRadius: 18,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      <View
                        style={{
                          width: '100%',
                          height: 94,
                          borderRadius: 12,
                          backgroundColor: '#f8fafc',
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                          padding: 3,
                        }}
                      >
                        {recImg ? (
                          <Image source={recImg} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                        ) : (
                          <ShoppingBag size={28} color="#cbd5e1" />
                        )}
                      </View>

                      <Text
                        numberOfLines={2}
                        style={{ fontSize: 12.5, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#0f172a', marginBottom: 6, lineHeight: 17, minHeight: 34 }}
                      >
                        {rec.name}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: fonts.black, fontWeight: 'normal', color: '#0f172a' }}>
                          ₹{recPrice}
                        </Text>

                        <Pressable
                          onPress={() => addItem(rec, rec.variants?.[0])}
                          hitSlop={6}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: '#059669',
                            backgroundColor: '#ffffff',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plus size={15} color="#059669" strokeWidth={3} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Apply Coupon Section matching Image 1 & 2 */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(120)}
          style={{
            backgroundColor: '#fffdf5',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: '#fcd34d',
            marginBottom: 20,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('ApplyCoupon')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Tag size={18} color="#d97706" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
                  {couponCode ? `Coupon applied: ${couponCode}` : 'Apply coupon'}
                </Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, fontWeight: 'normal', color: '#64748b', marginTop: 1 }}>
                  {couponCode ? `Saved ₹${discount}` : 'Offers & promo codes available'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#94a3b8" />
          </Pressable>

          {showCouponInput && !couponCode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
              <TextInput
                placeholder="Enter coupon code"
                placeholderTextColor="#94a3b8"
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#fcd34d',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  fontFamily: fonts.semiBold,
                  fontSize: 13,
                  fontWeight: 'normal',
                  color: '#0f172a',
                }}
              />
              <Pressable
                onPress={async () => {
                  if (!couponInput.trim()) return;
                  try {
                    await applyCoupon(couponInput.trim().toUpperCase());
                    setCouponInput('');
                    setShowCouponInput(false);
                  } catch {
                    // Handled in CartContext
                  }
                }}
                style={{
                  backgroundColor: '#059669',
                  paddingHorizontal: 14,
                  height: 40,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontWeight: 'normal', color: '#ffffff' }}>Apply</Text>
              </Pressable>
            </View>
          )}

          {couponCode && (
            <Pressable
              onPress={removeCoupon}
              hitSlop={8}
              style={{ alignSelf: 'flex-end', marginTop: 8 }}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, fontWeight: 'normal', color: '#ef4444' }}>
                Remove Coupon
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Bill Details Section matching Image 2 */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(180)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            marginBottom: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, fontWeight: 'normal', color: '#0f172a', marginBottom: 14 }}>
            Bill details
          </Text>

          <View style={{ gap: 10 }}>
            {/* Item Total */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, fontWeight: 'normal', color: '#64748b' }}>Item total</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {totalMrp > subtotal && (
                  <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#94a3b8', textDecorationLine: 'line-through', marginRight: 6 }}>
                    ₹{totalMrp}
                  </Text>
                )}
                <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, fontWeight: 'normal', color: '#0f172a' }}>
                  ₹{subtotal.toFixed(0)}
                </Text>
              </View>
            </View>

            {/* Delivery fee */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, fontWeight: 'normal', color: '#64748b' }}>Delivery fee</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: deliveryFee === 0 ? '#059669' : '#0f172a' }}>
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </Text>
            </View>

            {/* Taxes and charges if any */}
            {taxPercent > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.regular, fontSize: 14, fontWeight: 'normal', color: '#64748b' }}>
                  Taxes & charges ({taxPercent}%)
                </Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, fontWeight: 'normal', color: '#0f172a' }}>
                  ₹{(((Math.max(subtotal - discount, 0) * taxPercent) / 100)).toFixed(0)}
                </Text>
              </View>
            )}

            {/* Discount if coupon applied */}
            {discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.semiBold, fontSize: 14, fontWeight: 'normal', color: '#059669' }}>
                  Coupon Discount
                </Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: '#059669' }}>
                  -₹{discount}
                </Text>
              </View>
            )}

            <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 }} />

            {/* To pay */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, fontWeight: 'normal', color: '#0f172a' }}>To pay</Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 19, fontWeight: 'normal', color: '#0f172a' }}>
                ₹{toPay.toFixed(0)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Cancellation & Refund Policy Card */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(220)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            gap: 12,
            marginBottom: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} color="#047857" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#0f172a', fontWeight: 'normal', marginBottom: 2 }}>
              Cancellation & Refund Policy
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11.5, color: '#64748b', lineHeight: 16, fontWeight: 'normal' }}>
              Orders cannot be cancelled once dispatched. For quality issues, request instant refund in app.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Action & Payment Bar matching Image 4 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 14),
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        {/* UPI Payment Pill Strip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Dynamic payment logo matching defaultPayment app */}
            <View
              style={{
                width: 44,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                padding: 3,
              }}
            >
              <Image
                source={getPaymentLogo(defaultPayment?.app)}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </View>
            <View>
              <Text style={{ fontFamily: fonts.regular, fontSize: 11, fontWeight: 'normal', color: '#64748b' }}>Pay using</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: '#0f172a' }}>
                {defaultPayment?.app || 'UPI app'}
              </Text>
            </View>
          </View>

          <Pressable onPress={() => navigation.navigate('Payment')}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, fontWeight: 'normal', color: '#047857' }}>Change</Text>
          </Pressable>
        </View>

        {/* Place Order Primary Green Button */}
        <Pressable
          onPress={() => navigation.navigate('Checkout')}
          style={{
            backgroundColor: '#047857',
            borderRadius: 14,
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, fontWeight: 'normal', color: 'rgba(255, 255, 255, 0.85)' }}>
              Total
            </Text>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, fontWeight: 'normal', color: '#ffffff' }}>
              ₹{toPay.toFixed(0)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, fontWeight: 'normal', color: '#ffffff', marginRight: 6 }}>
              Place order
            </Text>
            <ArrowRight size={18} color="#ffffff" strokeWidth={2.6} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
