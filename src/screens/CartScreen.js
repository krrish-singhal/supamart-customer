import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Trash2, Plus, Minus, Ticket, Check, ShoppingBag, ArrowRight } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { collection, query, where, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Header, Card, Button, Input, Skeleton, ProductCard } from '../components/ui';
import { useCart } from '../context/CartContext';

const CATEGORY_GRADIENTS = [
  '#fef9c3', '#d1fae5', '#dbeafe', '#fce7f3',
  '#ede9fe', '#ffedd5', '#ecfdf5', '#f0f9ff',
];
const CATEGORY_ICONS = {
  vegetables: ShoppingBag, fruits: ShoppingBag, dairy: ShoppingBag, snacks: ShoppingBag,
  beverages: ShoppingBag, groceries: ShoppingBag, household: ShoppingBag, frozen: ShoppingBag,
  bakery: ShoppingBag, meat: ShoppingBag,
};

// ─── Empty cart ────────────────────────────────────────────────────────────────

function EmptyCart({ navigation }) {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, 'categories'), where('isActive', '==', true)), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.order||0)-(b.order||0)).slice(0, 6));
    });
    const unsubFeatured = onSnapshot(query(collection(db, 'products'), where('isFeatured', '==', true)), (snap) => {
      setFeatured(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 8));
      setLoading(false);
    });
    return () => { unsubCats(); unsubFeatured(); };
  }, []);

  const getCategoryIcon = (item) => {
    const IconComponent = CATEGORY_ICONS[item.name?.toLowerCase().split(' ')[0]] || ShoppingBag;
    return <IconComponent size={30} color="#64748b" />;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <Animated.View entering={FadeInDown.duration(400)} className="items-center pt-14 pb-8 px-6">
        <View
          className="w-28 h-28 rounded-full bg-primary-50 items-center justify-center mb-5 shadow-sm"
          style={{ borderWidth: 2, borderColor: '#dcfce7' }}
        >
          <Text style={{ fontSize: 56 }}>🛒</Text>
        </View>
        <Text className="text-2xl font-black text-text-primary mb-2 text-center">Your cart is empty</Text>
        <Text className="text-sm font-medium text-text-secondary text-center leading-6 mb-8">
          Looks like you haven't added anything yet.{'\n'}Start shopping to fill it up!
        </Text>

        <View className="flex-row w-full" style={{ gap: 10 }}>
          <Pressable
            onPress={() => navigation.navigate('Home')}
            className="flex-1 flex-row items-center justify-center bg-white border border-border rounded-2xl py-3.5"
          >
            <Text className="text-sm font-bold text-text-primary mr-1.5">Continue Shopping</Text>
            <ArrowRight size={15} color="#0f172a" />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('ProductList', { title: 'All Products' })}
            className="flex-1 flex-row items-center justify-center bg-primary-600 rounded-2xl py-3.5"
          >
            <ShoppingBag size={15} color="#fff" />
            <Text className="text-sm font-bold text-white ml-1.5">Shop Now</Text>
          </Pressable>
        </View>
      </Animated.View>

      {(loading || categories.length > 0) && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-7">
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-base font-black text-text-primary">Popular Categories</Text>
          </View>
          {loading ? (
            <View className="flex-row px-4" style={{ gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="items-center">
                  <Skeleton width={72} height={72} borderRadius={20} className="mb-2" />
                  <Skeleton width={56} height={10} borderRadius={6} />
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              renderItem={({ item, index }) => {
                const bg = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];
                return (
                  <Pressable
                    onPress={() => navigation.navigate('Category', { id: item.id, name: item.name })}
                    className="items-center"
                    style={{ width: 80 }}
                  >
                    <View className="w-[72px] h-[72px] rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: bg }}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        getCategoryIcon(item)
                      )}
                    </View>
                    <Text className="text-xs font-bold text-text-primary text-center" numberOfLines={2}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
          )}
        </Animated.View>
      )}

      {(loading || featured.length > 0) && (
        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-base font-black text-text-primary">Recommended for You</Text>
          </View>
          {loading ? (
            <View className="flex-row px-4" style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i}>
                  <Skeleton width={158} height={158} borderRadius={24} className="mb-2" />
                  <Skeleton width={120} height={12} borderRadius={6} className="mb-1" />
                  <Skeleton width={80} height={18} borderRadius={6} />
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  style={{ width: 158 }}
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                  onAdd={() => navigation.navigate('ProductDetail', { id: item.id })}
                />
              )}
            />
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ─── Main cart ─────────────────────────────────────────────────────────────────

export default function CartScreen({ navigation }) {
  const { items, subtotal, discount, total, couponCode, couponDetails, loading, updateQty, applyCoupon, removeCoupon, loadCart } = useCart();
  const [coupon, setCoupon] = useState('');
  const [applying, setApplying] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

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

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={{ paddingTop: 16, paddingBottom: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a' }}>Your Cart</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.productId}-${item.variantId}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(index * 80)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' }}>
              {(item.images && item.images[0]) || item.image ? (
                <Image source={{ uri: (item.images && item.images[0]) || item.image }} style={{ width: 56, height: 56, borderRadius: 8, marginRight: 16 }} contentFit="cover" />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 8, marginRight: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={24} color="#cbd5e1" />
                </View>
              )}
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 4 }} numberOfLines={2}>
                  {item.name} {item.variantLabel ? `, ${item.variantLabel}` : ''}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>₹{item.price}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#16a34a' }}>
                <Pressable
                  onPress={() => updateQty(item.productId, item.variantId, -1)}
                  style={{ width: 28, height: 28, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={14} color="#fff" strokeWidth={3} />
                </Pressable>
                <Text style={{ width: 32, textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#0f172a', backgroundColor: '#fff' }}>
                  {item.qty}
                </Text>
                <Pressable
                  onPress={() => updateQty(item.productId, item.variantId, 1)}
                  style={{ width: 28, height: 28, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={14} color="#fff" strokeWidth={3} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
        ListFooterComponent={
          <Animated.View entering={FadeInUp.duration(400).delay(200)} className="mt-4">
            
            {/* Recommendations */}
            {!loadingRecs && recommendations.length > 0 && (
              <View className="mb-6 -mx-4">
                <Text className="text-sm font-bold text-text-primary px-5 mb-3 uppercase tracking-wider">Before you checkout</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {recommendations.map(item => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      style={{ width: 140, marginRight: 12 }}
                      onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                      qty={items.find(i => i.productId === item.id)?.qty || 0}
                      onAdd={() => updateQty(item.id, item.variants?.[0]?.id || '', 1)}
                      onIncrement={() => updateQty(item.id, item.variants?.[0]?.id || '', 1)}
                      onDecrement={() => updateQty(item.id, item.variants?.[0]?.id || '', -1)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Coupon */}
            <View className="mb-6 px-4">
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>Coupon Code</Text>
              <View className="flex-row items-center">
                <Input
                  containerStyle={{ flex: 1, marginBottom: 0, marginRight: 12 }}
                  style={{ height: 48, borderRadius: 4, borderColor: '#e2e8f0' }}
                  placeholder="Enter coupon code"
                  value={coupon}
                  onChangeText={setCoupon}
                  autoCapitalize="characters"
                />
                  <Button
                    title={couponCode ? 'Remove' : 'Apply'}
                    onPress={couponCode ? removeCoupon : handleApplyCoupon}
                    loading={applying}
                    style={{ backgroundColor: '#16a34a', height: 48, paddingHorizontal: 20, borderRadius: 4 }}
                    textStyle={{ fontWeight: '800', fontSize: 14 }}
                    fullWidth={false}
                  />
              </View>
            </View>

            {/* Bill Summary */}
            <View className="px-4 mb-8">
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>Bill Summary</Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16 }}>
                <BillRow label="Item Total" value={`₹${subtotal.toFixed(2)}`} />
                <BillRow label="Delivery Fee" value="₹25" />
                <BillRow label="Taxes and Charges" value="₹12.50" />
                {discount > 0 && (
                  <BillRow label={`Coupon (${couponCode})`} value={`-₹${discount.toFixed(2)}`} color="#16a34a" />
                )}
                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 }} />
                <BillRow label="To Pay" value={`₹${(total + 25 + 12.50).toFixed(2)}`} bold />
              </View>
            </View>
              
            <View className="px-4">
              <Button
                title="Proceed to Pay"
                onPress={() => navigation.navigate('Checkout')}
                style={{ backgroundColor: '#16a34a', height: 52, borderRadius: 4 }}
                textStyle={{ fontWeight: '800', fontSize: 16 }}
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: bold ? '#0f172a' : '#64748b', fontWeight: bold ? '800' : '500' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: color || '#0f172a', fontWeight: bold ? '800' : '500' }}>
        {value}
      </Text>
    </View>
  );
}
