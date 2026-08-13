import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Header, Button, Input, Skeleton, ProductCard, FreeDeliveryBanner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { computeBill, DEFAULT_TAX_PERCENT } from '../utils/pricing';
import apiClient from '../services/api';
import { getProductImageSource } from '../utils/productImages';

// ─── Empty cart ────────────────────────────────────────────────────────────────
// Deliberately minimal — just the empty state, nothing else. No categories/recs
// sections here: this is a state within the Cart screen, not a separate page.

function EmptyCart({ navigation }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-24 h-24 rounded-full bg-primary-50 items-center justify-center mb-5"
        style={{ borderWidth: 2, borderColor: '#dcfce7' }}
      >
        <ShoppingBag size={36} color="#16a34a" strokeWidth={1.5} />
      </View>
      <Text className="text-xl font-black text-text-primary mb-2 text-center">Your cart is empty</Text>
      <Text className="text-sm font-medium text-text-secondary text-center leading-6 mb-8">
        Looks like you haven&apos;t added anything yet.
      </Text>
      <Pressable
        onPress={() => navigation.navigate('Home')}
        className="flex-row items-center justify-center bg-primary-600 rounded-lg px-8 py-3.5"
      >
        <Text className="text-sm font-bold text-white mr-1.5">Shop Now</Text>
        <ArrowRight size={15} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── Main cart ─────────────────────────────────────────────────────────────────

export default function CartScreen({ navigation }) {
  const { items, subtotal, discount, couponCode, loading, addItem, updateQty, applyCoupon, removeCoupon, loadCart } = useCart();
  const [coupon, setCoupon] = useState('');
  const [applying, setApplying] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [taxPercent, setTaxPercent] = useState(undefined);

  useEffect(() => {
    apiClient.get('/config').then(({ data }) => setTaxPercent(data.taxPercent)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchRecs = async () => {
      if (!items.length) return;
      try {
        const q = query(collection(db, 'products'), limit(30));
        const snap = await getDocs(q);
        const allProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const cartCategories = new Set(items.map(i => i.categoryId));
        let recs = [];
        if (cartCategories.size > 0) {
          recs = allProds.filter(p => cartCategories.has(p.categoryId) && !items.find(i => i.productId === p.id));
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Sync coupon input with context state
  useEffect(() => {
    setCoupon(couponCode || '');
  }, [couponCode]);

  // Resync from backend on focus to catch any server-side changes
  useFocusEffect(
    useCallback(() => {
      loadCart(true);
    }, [loadCart])
  );

  async function handleApplyCoupon() {
    setApplying(true);
    try {
      await applyCoupon(coupon);
    } finally {
      setApplying(false);
    }
  }

  if (loading && !items.length) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <Header title="Your Cart" showBack={false} />
        <View className="p-4">
          <Skeleton width="100%" height={100} borderRadius={20} className="mb-4" />
          <Skeleton width="100%" height={100} borderRadius={20} className="mb-4" />
          <Skeleton width="100%" height={150} borderRadius={24} className="mt-8" />
        </View>
      </SafeAreaView>
    );
  }

  if (!items.length) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Header title="Your Cart" showBack={false} />
        <EmptyCart navigation={navigation} />
      </SafeAreaView>
    );
  }

  const { deliveryFee, tax, toPay } = computeBill(subtotal, discount, taxPercent);

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Your Cart" showBack={false} />

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.productId}-${item.variantId}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(index * 80)}>
            <View className="flex-row items-center bg-white rounded-lg border border-border-light p-3 mb-3">
              {(getProductImageSource(item) || item.image) ? (
                <View style={{ width: 56, height: 56, borderRadius: 4, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <Image
                    source={getProductImageSource(item) || { uri: item.image }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
              ) : (
                <View className="w-14 h-14 rounded bg-surface-50 items-center justify-center">
                  <ShoppingBag size={24} color="#cbd5e1" />
                </View>
              )}
              <View className="flex-1 ml-4 pr-3">
                <Text className="text-[13px] font-semibold text-text-primary mb-1" numberOfLines={2}>
                  {item.name}{item.variantLabel ? `, ${item.variantLabel}` : ''}
                </Text>
                <Text className="text-sm font-black text-text-primary">₹{(item.price ?? 0).toFixed(2)}</Text>
              </View>
              <View className="flex-row items-center bg-white rounded-lg border-[1.5px] border-primary-600 overflow-hidden">
                <Pressable
                  onPress={() => updateQty(item.productId, item.variantId, -1)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Minus size={14} color="#16a34a" strokeWidth={3} />
                </Pressable>
                <Text className="w-8 text-center text-[13px] font-black text-text-primary bg-white">
                  {item.qty}
                </Text>
                <Pressable
                  onPress={() => updateQty(item.productId, item.variantId, 1)}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Plus size={14} color="#16a34a" strokeWidth={3} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
        ListFooterComponent={
          <Animated.View entering={FadeInUp.duration(400).delay(200)} className="mt-1">

            {/* Recommendations */}
            {!loadingRecs && recommendations.length > 0 && (
              <View className="mb-6 -mx-4">
                <Text className="text-sm font-bold text-text-primary px-5 mb-3 uppercase tracking-wider">Before you checkout</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {recommendations.map(item => {
                    const cartItem = items.find(i => i.productId === item.id);
                    const variantId = cartItem?.variantId || item.variants?.[0]?.id;
                    return (
                      <ProductCard
                        key={item.id}
                        item={item}
                        style={{ width: 140, marginRight: 12 }}
                        onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                        qty={cartItem?.qty || 0}
                        onAdd={() => addItem(item, item.variants[0])}
                        onIncrement={() => updateQty(item.id, variantId, 1)}
                        onDecrement={() => updateQty(item.id, variantId, -1)}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Coupon */}
            <View className="mb-6 px-4">
              <Text className="text-sm font-black text-text-primary mb-3">Coupon Code</Text>
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Input
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  style={{ height: 48, borderRadius: 8, borderColor: '#e2e8f0' }}
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChangeText={setCoupon}
                  autoCapitalize="characters"
                  editable={!couponCode}
                />
                <Button
                  title={couponCode ? 'Remove' : 'Apply'}
                  onPress={couponCode ? removeCoupon : handleApplyCoupon}
                  loading={applying}
                  disabled={applying || (!couponCode && !coupon.trim())}
                  variant={couponCode ? 'outline' : 'primary'}
                  fullWidth={false}
                  style={{ height: 48, paddingHorizontal: 20, borderRadius: 8 }}
                />
              </View>
            </View>

            {/* Free delivery nudge */}
            <View className="px-4 mb-4">
              <FreeDeliveryBanner subtotal={subtotal} />
            </View>

            {/* Bill Summary */}
            <View className="px-4 mb-8">
              <Text className="text-sm font-black text-text-primary mb-3">Bill Summary</Text>
              <View className="bg-white rounded-lg border border-border-light p-4">
                <BillRow label="Item Total (MRP)" value={`₹${subtotal.toFixed(2)}`} />
                {discount > 0 && (
                  <BillRow label={`Coupon (${couponCode})`} value={`-₹${discount.toFixed(2)}`} color="#16a34a" />
                )}
                <BillRow label={`GST (${taxPercent ?? DEFAULT_TAX_PERCENT}%)`} value={`₹${tax.toFixed(2)}`} />
                <BillRow label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`} color={deliveryFee === 0 ? '#16a34a' : undefined} />
                <View className="h-[1px] bg-border-light my-3" />
                <BillRow label="To Pay" value={`₹${toPay.toFixed(2)}`} bold />
              </View>
            </View>

            <View className="px-4">
              <Button
                title={`Proceed to Pay ₹${toPay.toFixed(2)}`}
                onPress={() => navigation.navigate('Checkout')}
                style={{ height: 52, borderRadius: 8 }}
              />
            </View>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}

function BillRow({ label, value, bold, color }) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className={`text-[13px] ${bold ? 'font-black text-text-primary' : 'font-medium text-text-secondary'}`}>{label}</Text>
      <Text
        className={`text-[13px] ${bold ? 'font-black' : 'font-medium'}`}
        style={color ? { color } : bold ? { color: '#0f172a' } : { color: '#0f172a' }}
      >
        {value}
      </Text>
    </View>
  );
}
