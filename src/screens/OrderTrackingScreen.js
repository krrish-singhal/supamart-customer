import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Clock, Package, MapPin, RefreshCcw, XCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Header, Card, Skeleton, Button } from '../components/ui';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';

// No step-by-step fulfillment timeline here on purpose — this isn't a warehouse app,
// the customer only cares about one thing: is my payment confirmed or not. The order's
// live paymentStatus/status (via onSnapshot below) drives exactly one of three states.
//
// Deliberately plain <View style={{...}}> here, NOT <Card className="bg-...">. Card
// hardcodes `bg-white` in its own className string ahead of whatever the caller passes,
// and NativeWind resolves conflicting utility classes by stylesheet order (not by
// position in the string) — so a caller-supplied bg-primary-600/bg-amber-50/bg-red-50
// silently loses to Card's bg-white, rendering these cards blank with near-invisible
// text. Inline styles have no such ordering ambiguity, so they're used for every color
// here (background AND text) to fully sidestep the issue.
function StatusHeadline({ order }) {
  const isRejected = order.status === 'CANCELLED';
  const isPaid = order.paymentStatus === 'PAID';

  if (isRejected) {
    return (
      <View style={{ borderRadius: 24, padding: 20, marginBottom: 24, backgroundColor: '#fef2f2' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', marginBottom: 4, color: '#dc2626' }}>Order Rejected</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#f87171' }}>Order #{order.orderNo}</Text>
          </View>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2' }}>
            <XCircle size={24} color="#dc2626" />
          </View>
        </View>
        {order.paymentRejectionReason ? (
          <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#fee2e2' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: '#ef4444' }}>Reason</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', lineHeight: 20, color: '#b91c1c' }}>{order.paymentRejectionReason}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (isPaid) {
    return (
      <View
        style={{
          borderRadius: 16,
          padding: 22,
          marginBottom: 24,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#dcfce7',
          shadowColor: '#16a34a',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16a34a', marginRight: 14 }}>
            <Package size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#16a34a', marginBottom: 2 }}>Order Placed!</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d' }}>Order #{order.orderNo}</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: '#f0fdf4', marginVertical: 16 }} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', lineHeight: 20 }}>
          Our delivery partner will deliver it to your doorstep soon.
        </Text>
      </View>
    );
  }

  // AWAITING_CONFIRMATION (or still PENDING) — customer claimed payment, shop hasn't verified yet.
  return (
    <View style={{ borderRadius: 24, padding: 20, marginBottom: 24, backgroundColor: '#fffbeb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', marginBottom: 4, color: '#b45309' }}>Waiting for Admin Approval</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#d97706' }}>
          We're verifying your payment — this usually takes just a few minutes. You'll be notified the moment it's confirmed.
        </Text>
      </View>
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' }}>
        <Clock size={24} color="#b45309" />
      </View>
    </View>
  );
}

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId, orderNo } = route.params;
  const { loadCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repeating, setRepeating] = useState(false);

  const handleRepeatOrder = async () => {
    setRepeating(true);
    try {
      const items = order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty
      }));

      await apiClient.put('/cart', { items });
      // The PUT above updates the cart server-side, but CartContext's local `items`
      // state (what CartScreen actually renders) won't reflect it until we force a
      // refresh — without this, navigating to Cart shows whatever was there before.
      await loadCart(true, { force: true });

      Toast.show({ type: 'success', text1: 'Items added to cart.' });
      navigation.navigate('Main', { screen: 'Cart' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not repeat order.' });
    } finally {
      setRepeating(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [orderId]);

  // Reached via navigation.replace() from Payment, so goBack() would land back on
  // Checkout — confusing once an order already exists. Go straight Home instead, so the
  // customer can freely keep shopping while this order awaits approval.
  const goHome = () => navigation.navigate('Main');

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <Header title={`Order #${orderNo}`} onBack={goHome} />
        <View className="p-4">
          <Skeleton width="100%" height={100} borderRadius={24} className="mb-6" />
          <Skeleton width="100%" height={300} borderRadius={24} className="mb-6" />
        </View>
      </SafeAreaView>
    );
  }

  const isRejected = order.status === 'CANCELLED';

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Track Order" onBack={goHome} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <StatusHeadline order={order} />
        </Animated.View>

        {/* Order summary */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Card elevation="sm" className="p-5 border-0 bg-white mb-6">
            <Text className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Order Summary</Text>
            {order.items?.map((item, i) => (
              <View key={i} className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center flex-1 pr-4">
                  <Text className="text-sm font-medium text-text-primary" numberOfLines={2}>
                    {item.qty} × {item.name} <Text className="text-text-tertiary text-xs">({item.variantLabel})</Text>
                  </Text>
                </View>
                <Text className="text-sm font-bold text-text-primary">₹{(item.price * item.qty).toFixed(2)}</Text>
              </View>
            ))}
            <View className="h-px bg-border-light my-4" />
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-bold text-[#059669]">Total Paid</Text>
              <Text className="text-lg font-black text-[#059669]">₹{order.total?.toFixed(2)}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Delivery address */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card elevation="sm" className="p-4 border-0 bg-white flex-row items-start">
            <MapPin size={24} color="#059669" className="mr-4 mt-1" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary uppercase tracking-wider mb-2">Delivery Details</Text>
            <Text className="text-sm font-bold text-text-primary mb-1">
              {order.addressSnapshot?.houseNo}, {order.addressSnapshot?.street}
            </Text>
            {order.addressSnapshot?.landmark && (
              <Text className="text-xs font-medium text-text-secondary mb-0.5">
                Landmark: {order.addressSnapshot.landmark}
              </Text>
            )}
              <Text className="text-sm text-text-secondary font-medium mt-1">{order.addressSnapshot?.pincode}</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(300)} className="mt-4">
          <Button
            title={isRejected ? 'Try Again' : 'Repeat Last Order'}
            onPress={handleRepeatOrder}
            loading={repeating}
            icon={!repeating && <RefreshCcw size={18} color="#fff" />}
            style={{ backgroundColor: '#059669', height: 50, borderRadius: 8 }}
            textStyle={{ fontWeight: '700', fontSize: 16 }}
            fullWidth
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
