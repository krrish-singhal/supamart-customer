import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, Pressable, StatusBar, ScrollView, RefreshControl, BackHandler, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Package,
  ShoppingBag,
  Trash2,
  Star,
} from '../components/icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { collection, query, where, onSnapshot } from '../services/reads';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Skeleton, ProductCard, Dialog } from '../components/ui';
import OrderRatings from '../components/OrderRatings';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { getProductImageSource } from '../utils/productImages';
import { fonts } from '../theme/typography';

const CATEGORY_GRADIENTS = [
  '#fef9c3', '#d1fae5', '#dbeafe', '#fce7f3',
  '#ede9fe', '#ffedd5', '#ecfdf5', '#f0f9ff',
];
const CATEGORY_ICONS = {
  vegetables: ShoppingBag, fruits: ShoppingBag, dairy: ShoppingBag, snacks: ShoppingBag,
  beverages: ShoppingBag, groceries: ShoppingBag, household: ShoppingBag, frozen: ShoppingBag,
};

function formatOrderDateTime(createdAt) {
  if (!createdAt) return '';
  const d =
    typeof createdAt === 'number'
      ? new Date(createdAt)
      : createdAt.toDate
      ? createdAt.toDate()
      : new Date(createdAt);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${timeStr}`;
}

function renderStatusBadge(status) {
  if (status === 'DELIVERED') {
    return (
      <View
        style={{
          backgroundColor: '#ecfdf5',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4.5,
        }}
      >
        <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#059669', letterSpacing: 0.3 }}>
          DELIVERED
        </Text>
      </View>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <View
        style={{
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4.5,
        }}
      >
        <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#ef4444', letterSpacing: 0.3 }}>
          CANCELLED
        </Text>
      </View>
    );
  }

  // All ongoing statuses (PLACED, ACCEPTED, PACKED, OUT_FOR_DELIVERY)
  return (
    <View
      style={{
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4.5,
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#b45309', letterSpacing: 0.3 }}>
        ON THE WAY
      </Text>
    </View>
  );
}

function EmptyOrders({ navigation }) {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), where('isActive', '==', true)),
      (snap) => {
        const topLevel = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => !c.parentId);
        setCategories(topLevel.sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 6));
      },
      (err) => console.warn('OrdersScreen categories listener error:', err)
    );
    const unsubFeatured = onSnapshot(
      query(collection(db, 'products'), where('isFeatured', '==', true)),
      (snap) => {
        setFeatured(snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 8));
        setLoading(false);
      },
      (err) => {
        console.warn('OrdersScreen featured products listener error:', err);
        setLoading(false);
      }
    );
    return () => {
      unsubCats();
      unsubFeatured();
    };
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
        <Text className="text-[22px] font-extrabold text-text-primary mb-2 text-center">No orders yet</Text>
        <Text className="text-sm font-medium text-text-secondary text-center leading-6 mb-8">
          Your order history will appear here.{'\n'}Start shopping to place your first order!
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
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
                    <View
                      className="w-[72px] h-[72px] rounded-2xl items-center justify-center mb-2 overflow-hidden"
                      style={{ backgroundColor: bg }}
                    >
                      {item.image ? (
                        <Image
                          source={{ uri: optimizeCloudinaryUrl(item.image, 200) }}
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

export default function OrdersScreen({ navigation }) {
  const { userProfile } = useContext(AuthContext);
  const { loadCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ONGOING' | 'DELIVERED'

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
  const handleBack = () => {
    const routes = navigation.getState()?.routes || [];
    const prevRoute = routes[routes.length - 2]?.name;
    if (
      !prevRoute ||
      prevRoute === 'OrderTracking' ||
      prevRoute === 'OrderConfirmation' ||
      prevRoute === 'Checkout' ||
      prevRoute === 'Payment'
    ) {
      navigation.navigate('Main', { screen: 'Home' });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [navigation]);

  const handleDeleteOrder = (order) => setPendingDeleteOrder(order);

  const confirmDeleteOrder = async () => {
    const order = pendingDeleteOrder;
    setPendingDeleteOrder(null);
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    try {
      await apiClient.patch(`/orders/${order.id}/hide`);
      Toast.show({ type: 'success', text1: 'Order removed', text2: `Order #${order.orderNo} removed from your history.` });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not remove order', text2: 'Please try again.' });
      fetchOrders();
    }
  };

  const handleReorder = async (order) => {
    if (!order?.items?.length) return;
    try {
      const items = order.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
      }));

      await apiClient.put('/cart', { items });
      await loadCart(true, { force: true });
      Toast.show({ type: 'success', text1: 'Items added to cart.' });
      navigation.navigate('Cart');
    } catch {
      Toast.show({ type: 'error', text1: 'Could not reorder.' });
    }
  };

  const filteredOrders = useMemo(() => {
    if (activeTab === 'ONGOING') {
      return orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
    }
    if (activeTab === 'DELIVERED') {
      return orders.filter((o) => o.status === 'DELIVERED');
    }
    return orders;
  }, [orders, activeTab]);

  if (loading) return <OrdersSkeleton />;

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }} edges={['top', 'bottom']}>
        <Package size={48} color="#94a3b8" strokeWidth={1.5} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16, marginBottom: 24 }}>
          Couldn&apos;t load orders
        </Text>
        <Pressable onPress={() => fetchOrders()} style={{ backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header matching Image 4 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
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
            marginRight: 6,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.4 }}>
          My orders
        </Text>
      </View>

      {/* Segmented Filter Tabs matching Image 4 */}
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            borderRadius: 16,
            padding: 4,
          }}
        >
          {[
            { key: 'ALL', label: 'All' },
            { key: 'ONGOING', label: 'Ongoing' },
            { key: 'DELIVERED', label: 'Delivered' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderRadius: 12,
                  shadowColor: isActive ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 3,
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#0f172a' : '#64748b',
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!orders.length ? (
        <EmptyOrders navigation={navigation} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Package size={48} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748b', marginTop: 12 }}>
                No {activeTab.toLowerCase()} orders found
              </Text>
            </View>
          )}
          renderItem={({ item, index }) => {
            const isDelivered = item.status === 'DELIVERED';
            const isOngoing = !isDelivered && item.status !== 'CANCELLED';
            const itemCount = item.items?.length || 0;
            const orderTotal = Math.round(item.total || item.totalAmount || 0);

            return (
              <Animated.View entering={FadeInDown.duration(300).delay(index < 6 ? index * 40 : 0)}>
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 22,
                    padding: 18,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  {/* Top Row: Order # and Date + Status Badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 16.5, fontWeight: '800', color: '#0f172a' }}>
                        Order #{item.orderNo}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                        {formatOrderDateTime(item.createdAt)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {renderStatusBadge(item.status)}
                      <Pressable
                        onPress={() => handleDeleteOrder(item)}
                        hitSlop={8}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: 6,
                          opacity: 0.4,
                        }}
                      >
                        <Trash2 size={13} color="#94a3b8" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Middle Row: Product Thumbnails + Total Amount / Item Count */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 16,
                    }}
                  >
                    {/* Thumbnails */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                      {item.items?.slice(0, 3).map((prod, pIdx) => {
                        const imageSource =
                          getProductImageSource(prod) || { uri: optimizeCloudinaryUrl(prod.image, 200) };
                        return (
                          <View
                            key={pIdx}
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
                            }}
                          >
                            <Image
                              source={imageSource}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="contain"
                              cachePolicy="memory-disk"
                            />
                          </View>
                        );
                      })}
                      {item.items?.length > 3 && (
                        <View
                          style={{
                            width: 32,
                            height: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>
                            +{item.items.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Total Amount & Items Count matching Image 4 */}
                    <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                        ₹{orderTotal}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </View>

                  {/* Rate this order bar for DELIVERED orders matching Image 2 */}
                  {isDelivered && (
                    <Pressable
                      onPress={() => setRatingOrder(item)}
                      style={{
                        backgroundColor: '#fffbeb',
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        marginTop: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#1e293b' }}>
                          {item.ratings?.orderRating ? 'Rated ' : 'Rate this order'}
                        </Text>
                        {item.ratings?.orderRating ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Star size={13} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 3 }} />
                            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#b45309' }}>
                              {item.ratings.orderRating}/5
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = star <= (item.ratings?.orderRating || 0);
                          return (
                            <Star
                              key={star}
                              size={18}
                              color="#f59e0b"
                              fill={isFilled ? '#f59e0b' : 'transparent'}
                              strokeWidth={1.8}
                            />
                          );
                        })}
                      </View>
                    </Pressable>
                  )}

                  {/* Actions matching Image 2: [Track order / View details / Refund status] + [Reorder] */}
                  {item.status === 'CANCELLED' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
                      <Pressable
                        onPress={() =>
                          navigation.navigate('RefundStatus', {
                            orderId: item.id,
                            orderNo: item.orderNo,
                            order: item,
                          })
                        }
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: '#087f46',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#ffffff' }}>
                          Refund status
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          navigation.navigate('OrderDetail', {
                            orderId: item.id,
                            orderNo: item.orderNo,
                          })
                        }
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          backgroundColor: '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#0f172a' }}>
                          View details
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
                      <Pressable
                        onPress={() =>
                          navigation.navigate(isOngoing ? 'OrderTracking' : 'OrderDetail', {
                            orderId: item.id,
                            orderNo: item.orderNo,
                            fromOrders: true,
                          })
                        }
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          backgroundColor: '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#0f172a' }}>
                          {isOngoing ? 'Track order' : 'View details'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleReorder(item)}
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: '#087f46',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#ffffff' }}>
                          Reorder
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Rating Modal containing comprehensive OrderRatings component */}
      {ratingOrder && (
        <Modal
          visible={!!ratingOrder}
          transparent
          animationType="slide"
          onRequestClose={() => setRatingOrder(null)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              justifyContent: 'flex-end',
            }}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setRatingOrder(null)}
            />
            <View
              style={{
                backgroundColor: '#f6f8f6',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: '90%',
                overflow: 'hidden',
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                <OrderRatings
                  order={ratingOrder}
                  onDismiss={() => {
                    setRatingOrder(null);
                    fetchOrders();
                  }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <Dialog
        visible={!!pendingDeleteOrder}
        title="Remove this order?"
        message={`Order #${pendingDeleteOrder?.orderNo} will be removed from your order history. This won't affect the order itself.`}
        confirmText="Remove"
        cancelText="Cancel"
        destructive
        onConfirm={confirmDeleteOrder}
        onCancel={() => setPendingDeleteOrder(null)}
      />
    </SafeAreaView>
  );
}

function OrdersSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#ffffff' }}>
        <Skeleton width={140} height={28} borderRadius={8} />
      </View>
      <View style={{ padding: 16, gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={140} borderRadius={22} />
        ))}
      </View>
    </SafeAreaView>
  );
}
