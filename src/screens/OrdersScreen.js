import { useEffect, useState, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, Pressable, StatusBar, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { Skeleton, Card, StatusChip, ProductCard } from '../components/ui';
import apiClient from '../services/api';

const STATUS_COLOR = {
  ORDER_PLACED:       { bg: 'bg-blue-50',     text: 'text-blue-600' },
  ORDER_ACCEPTED:     { bg: 'bg-indigo-50',   text: 'text-indigo-600' },
  PACKING:            { bg: 'bg-orange-50',   text: 'text-orange-600' },
  READY_FOR_DELIVERY: { bg: 'bg-amber-50',    text: 'text-amber-700' },
  OUT_FOR_DELIVERY:   { bg: 'bg-sky-50',      text: 'text-sky-700' },
  DELIVERED:          { bg: 'bg-primary-50',  text: 'text-primary-700' },
  CANCELLED:          { bg: 'bg-red-50',      text: 'text-red-600' },
};

const STATUS_LABEL = {
  ORDER_PLACED:       'Placed',
  ORDER_ACCEPTED:     'Accepted',
  PACKING:            'Packing',
  READY_FOR_DELIVERY: 'Ready',
  OUT_FOR_DELIVERY:   'On the way',
  DELIVERED:          'Delivered',
  CANCELLED:          'Cancelled',
};

const CATEGORY_GRADIENTS = [
  '#fef9c3', '#d1fae5', '#dbeafe', '#fce7f3',
  '#ede9fe', '#ffedd5', '#ecfdf5', '#f0f9ff',
];
const CATEGORY_ICONS = {
  vegetables: ShoppingBag, fruits: ShoppingBag, dairy: ShoppingBag, snacks: ShoppingBag,
  beverages: ShoppingBag, groceries: ShoppingBag, household: ShoppingBag, frozen: ShoppingBag,
};

function EmptyOrders({ navigation }) {
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
          className="w-28 h-28 rounded-full bg-primary-50 items-center justify-center mb-5"
          style={{ borderWidth: 2, borderColor: '#dcfce7' }}
        >
          <Package size={56} color="#16a34a" />
        </View>
        <Text className="text-2xl font-black text-text-primary mb-2 text-center">No orders yet</Text>
        <Text className="text-sm font-medium text-text-secondary text-center leading-6 mb-8">
          Your order history will appear here.{'\n'}Start shopping to place your first order!
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Home')}
          className="flex-row items-center justify-center bg-primary-600 rounded-2xl py-3.5 px-8"
        >
          <ShoppingBag size={16} color="#fff" />
          <Text className="text-sm font-bold text-white ml-2">Start Shopping</Text>
        </Pressable>
      </Animated.View>

      {(loading || categories.length > 0) && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-7">
          <Text className="text-base font-black text-text-primary px-5 mb-3">Popular Categories</Text>
          {loading ? (
            <View className="flex-row px-4" style={{ gap: 10 }}>
              {[0,1,2,3].map(i => (
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
                    <View className="w-[72px] h-[72px] rounded-2xl items-center justify-center mb-2 overflow-hidden"
                      style={{ backgroundColor: bg }}>
                      {item.image ? (
                        <Image
                          source={{ uri: item.image }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      ) : (
                        getCategoryIcon(item)
                      )}
                    </View>
                    <Text className="text-xs font-bold text-text-primary text-center" numberOfLines={2}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </Animated.View>
      )}

      {(loading || featured.length > 0) && (
        <Animated.View entering={FadeInDown.duration(400).delay(180)}>
          <Text className="text-base font-black text-text-primary px-5 mb-3">Recommended for You</Text>
          {loading ? (
            <View className="flex-row px-4" style={{ gap: 12 }}>
              {[0,1].map(i => (
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

export default function OrdersScreen({ navigation }) {
  const { userProfile } = useContext(AuthContext);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(false);

  // Use the backend API — avoids Firestore security rules and works for
  // both real Firebase-auth users and demo-bypass sessions.
  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get('/orders/mine?limit=50');
      setOrders(res.data.items || []);
    } catch (err) {
      console.error('Orders fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userProfile) fetchOrders();
    }, [userProfile, fetchOrders])
  );

  if (loading) return <OrdersSkeleton />;

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50 items-center justify-center" edges={['top']}>
        <Package size={48} color="#94a3b8" strokeWidth={1.5} />
        <Text className="text-base font-semibold text-text-secondary mt-4 mb-6">
          Couldn't load orders
        </Text>
        <Pressable onPress={() => fetchOrders()} className="bg-primary-600 px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!orders.length) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View className="px-5 pt-5 pb-3">
          <Text className="text-2xl font-black text-text-primary tracking-tight">My Orders</Text>
        </View>
        <EmptyOrders navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View className="px-5 pt-5 pb-3">
        <Text className="text-2xl font-black text-text-primary tracking-tight">My Orders</Text>
        <Text className="text-sm font-medium text-text-tertiary mt-0.5">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={['#16a34a']} tintColor="#16a34a" />
        }
        renderItem={({ item, index }) => {
          const colors = STATUS_COLOR[item.status] || { bg: 'bg-surface-100', text: 'text-text-secondary' };
          return (
            <Animated.View entering={FadeInDown.duration(350).delay(index < 6 ? index * 50 : 0)}>
              <Card
                elevation="sm"
                className="mb-3 border-0 bg-white"
                onPress={() => navigation.navigate('OrderTracking', { orderId: item.id, orderNo: item.orderNo })}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View>
                    <Text className="text-base font-black text-text-primary">Order #{item.orderNo}</Text>
                    <Text className="text-xs font-medium text-text-tertiary mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                    <Text className={`text-xs font-bold ${colors.text}`}>
                      {STATUS_LABEL[item.status] || item.status}
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-medium text-text-secondary mb-3" numberOfLines={1}>
                  {item.items?.map((i) => `${i.name} ×${i.qty}`).join(', ')}
                </Text>

                <View className="flex-row items-center justify-between pt-3 border-t border-border-light">
                  <Text className="text-base font-black text-text-primary">₹{item.total?.toFixed(2)}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-xs font-semibold text-primary-600 mr-1">View details</Text>
                    <ChevronRight size={14} color="#16a34a" />
                  </View>
                </View>
              </Card>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function OrdersSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <View className="px-5 pt-5 pb-3">
        <Skeleton width={140} height={28} borderRadius={8} />
        <Skeleton width={80} height={14} borderRadius={6} className="mt-2" />
      </View>
      <View className="p-4 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={110} borderRadius={24} />
        ))}
      </View>
    </SafeAreaView>
  );
}
