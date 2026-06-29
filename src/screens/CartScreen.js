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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
      <Header title="Your Cart" showBack={false} />

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.productId}-${item.variantId}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(index * 80)}>
            <Card elevation="sm" className="flex-row items-center p-3 mb-3 border-0 bg-white">
              <View className="flex-1 pr-2">
                <Text className="text-sm font-semibold text-text-primary mb-1" numberOfLines={2}>
                  {item.name}
                </Text>
                <Text className="text-xs text-text-tertiary font-medium mb-2">{item.variantLabel}</Text>
                <Text className="text-base font-bold text-text-primary">₹{item.price}</Text>
              </View>
              <View className="flex-row items-center bg-surface-100 rounded-full p-1 border border-border-light">
                <Pressable
                  onPress={() => updateQty(item.productId, item.variantId, -1)}
                  className="w-8 h-8 rounded-full bg-white shadow-sm items-center justify-center border border-border-light"
                >
                  {item.qty === 1 ? <Trash2 size={14} color="#ef4444" /> : <Minus size={14} color="#0f172a" />}
                </Pressable>
                <Text className="w-8 text-center text-base font-bold text-text-primary">{item.qty}</Text>
                <Pressable
                  onPress={() => updateQty(item.productId, item.variantId, 1)}
                  className="w-8 h-8 rounded-full bg-primary-600 shadow-sm items-center justify-center"
                >
                  <Plus size={14} color="#ffffff" />
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        )}
        ListFooterComponent={
          <Animated.View entering={FadeInUp.duration(400).delay(300)} className="mt-4">
            {/* Coupon */}
            <View className="flex-row items-end mb-6">
              <Input
                containerStyle={{ flex: 1, marginBottom: 0, marginRight: 12 }}
                style={{ height: 48 }}
                placeholder="Enter coupon code"
                value={coupon}
                onChangeText={setCoupon}
                autoCapitalize="characters"
                leftIcon={<Ticket size={18} color="#94a3b8" />}
              />
              <Button
                title={couponCode ? 'Remove' : 'Apply'}
                onPress={couponCode ? removeCoupon : handleApplyCoupon}
                loading={applying}
                variant={couponCode ? 'outline' : 'primary'}
                size="sm"
                fullWidth={false}
                className="h-12 w-24"
              />
            </View>

            {/* Bill Details */}
            <Text className="text-lg font-bold text-text-primary mb-3 px-1">Bill Details</Text>
            <Card elevation="sm" className="p-4 border-0 mb-8 bg-white">
              <BillRow label="Item Total" value={`₹${subtotal.toFixed(2)}`} />
              <BillRow label="Delivery Fee" value="Free" color="text-primary-600" />
              {discount > 0 && (
                <BillRow label={`Coupon Applied (${couponCode} - ${couponDetails?.value || ''}${couponDetails?.kind === 'PERCENT' ? '%' : '₹'} off)`} value={`-₹${discount.toFixed(2)}`} color="text-primary-600" />
              )}
              <View className="h-px bg-border-light my-3" />
              <BillRow label="To Pay" value={`₹${total.toFixed(2)}`} bold />
            </Card>
              <Button
                title={`Checkout · ₹${total.toFixed(2)}`}
                onPress={() => navigation.navigate('Checkout')}
                size="lg"
                icon={<Check size={20} color="#fff" />}
                className="mt-2"
              />
            </Animated.View>
          }
        />
      </SafeAreaView>
  );
}

function BillRow({ label, value, bold, color }) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className={`text-sm ${bold ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>{label}</Text>
      <Text className={`text-sm ${bold ? 'font-bold text-text-primary text-base' : color || 'font-semibold text-text-primary'}`}>
        {value}
      </Text>
    </View>
  );
}
