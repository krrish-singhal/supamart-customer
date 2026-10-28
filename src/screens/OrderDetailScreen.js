import OrderRatings from '../components/OrderRatings';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { doc, onSnapshot } from '../services/reads';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  CreditCard,
  RotateCcw,
} from '../components/icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import { Skeleton } from '../components/ui';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Delivery is taking too long',
  'Want to change items',
  'Want to change address',
  'Other reason',
];

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId, orderNo: initialOrderNo, order: passedOrder } = route.params || {};

  const [order, setOrder] = useState(passedOrder || null);
  const [loading, setLoading] = useState(!passedOrder);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Ordered by mistake');
  const [cancelling, setCancelling] = useState(false);

  // Real-time Firestore snapshot for the order
  useEffect(() => {
    let isMounted = true;
    if (!orderId) {
      apiClient
        .get('/orders/mine')
        .then(({ data }) => {
          const found = data.items?.find((o) => o.id === orderId || o.orderNo === initialOrderNo);
          if (found && isMounted) setOrder(found);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      return;
    }

    // Direct API fallback for instantaneous reliable loading
    apiClient
      .get(`/orders/${orderId}`)
      .then(({ data }) => {
        if (data && isMounted) {
          setOrder((prev) => (prev ? { ...prev, ...data } : data));
          setLoading(false);
        }
      })
      .catch(() => {});

    const unsub = onSnapshot(
      doc(db, 'orders', orderId, { pollInterval: 15000 }),
      (snap) => {
        if (snap.exists() && isMounted) {
          setOrder({ id: snap.id, ...snap.data() });
        }
        if (isMounted) setLoading(false);
      },
      () => {
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, [orderId, initialOrderNo]);

  const displayOrderNo = order?.orderNo || initialOrderNo || '—';
  const orderTotal = order?.totalAmount ?? order?.finalAmount ?? order?.total ?? 0;

  const items = order?.items || [];
  const itemCount = items.reduce((acc, it) => acc + (it.qty || 1), 0);

  const isCancelled = order?.status === 'CANCELLED';
  const isDelivered = order?.status === 'DELIVERED';
  const canCancel = !isCancelled && !isDelivered;

  const savedAddress = order?.addressSnapshot || order?.address;
  const address = typeof savedAddress === 'string' ? savedAddress : [savedAddress?.houseNo, savedAddress?.street, savedAddress?.landmark, savedAddress?.pincode].filter(Boolean).join(', ') || 'Address unavailable';

  async function handleCancelOrder() {
    setCancelling(true);
    try {
      if (order?.id) {
        await apiClient.patch(`/orders/${order.id}/cancel`, { reason: selectedReason });
      }
      Toast.show({ type: 'success', text1: 'Order cancelled successfully' });
      setShowCancelModal(false);
      navigation.navigate('RefundStatus', {
        orderId: order?.id || orderId,
        orderNo: displayOrderNo,
        order: { ...order, status: 'CANCELLED' },
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Could not cancel order',
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6f4' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER: < Order #10482 | Date/time | Download icon matching Image 4 */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => navigation.goBack()}
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
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
          </Pressable>

          <View>
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 18.5,
                fontWeight: '900',
                color: '#0f172a',
                letterSpacing: -0.3,
              }}
            >
              Order #{displayOrderNo}
            </Text>
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 12.5,
                fontWeight: '500',
                color: '#64748b',
                marginTop: 1,
              }}
            >
              {order?.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
            </Text>
          </View>
        </View>
      </View>

      {loading && !order ? (
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton width="100%" height={68} borderRadius={18} />
          <Skeleton width="100%" height={180} borderRadius={22} />
          <Skeleton width="100%" height={140} borderRadius={22} />
        </View>
      ) : !order ? <View style={{ padding: 24 }}><Text>Order unavailable. Please reopen it from your order history.</Text></View> : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 14 }}
        >
          {isDelivered && <OrderRatings key={order.id} order={order} />}
          {order.notes ? <View style={{ padding: 16, backgroundColor: '#f0fdf4', borderRadius: 16 }}><Text style={{ fontFamily: 'Inter-Bold' }}>Delivery instructions</Text><Text style={{ marginTop: 6 }}>{order.notes}</Text></View> : null}
          {/* AMBER LIVE TRACKING BANNER matching Image 4 */}
          {!isCancelled && !isDelivered && (
            <Animated.View entering={FadeInDown.duration(280)}>
              <Pressable
                onPress={() =>
                  navigation.navigate('OrderTracking', {
                    orderId: order?.id || orderId,
                    orderNo: displayOrderNo,
                    fromOrderDetail: true,
                  })
                }
                style={{
                  backgroundColor: '#fffbeb',
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#fef3c7',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#d97706',
                      marginRight: 10,
                    }}
                  />
                  <View>
                    <Text
                      style={{
                        fontFamily: fonts.extraBold,
                        fontSize: 14,
                        fontWeight: '900',
                        color: '#78350f',
                      }}
                    >
                      {order?.status === 'OUT_FOR_DELIVERY'
                        ? 'On the way · arriving in 9 mins'
                        : (order?.deliveryPartner?.name || order?.deliveryBoyName)
                        ? `Assigned to ${order?.deliveryPartner?.name || order?.deliveryBoyName}`
                        : order?.status === 'PACKED'
                        ? 'Order packed · assigning delivery partner'
                        : 'Order confirmed · preparing your items'}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 12,
                        fontWeight: '600',
                        color: '#92400e',
                        marginTop: 2,
                      }}
                    >
                      Tap to track live
                    </Text>
                  </View>
                </View>

                <ChevronRight size={18} color="#92400e" strokeWidth={2.6} />
              </Pressable>
            </Animated.View>
          )}

          {/* CANCELLED STATUS BANNER LINKING TO REFUND STATUS */}
          {isCancelled && (
            <Pressable
              onPress={() =>
                navigation.navigate('RefundStatus', {
                  orderId: order?.id || orderId,
                  orderNo: displayOrderNo,
                  order,
                })
              }
              style={{
                backgroundColor: '#fee2e2',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: '#fecaca',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={16} color="#991b1b" strokeWidth={2.4} />
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: '800', color: '#991b1b' }}>
                    Order Cancelled · Refund in Progress
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, fontWeight: '500', color: '#b91c1c', marginTop: 3 }}>
                  ₹{orderTotal} refund workflow initiated. Tap to view live status.
                </Text>
              </View>
              <ChevronRight size={18} color="#991b1b" strokeWidth={2.6} />
            </Pressable>
          )}

          {/* CARD 1: ITEMS LIST matching Image 4 */}
          <Animated.View entering={FadeInDown.duration(300).delay(60)}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 15.5,
                  fontWeight: '900',
                  color: '#0f172a',
                  marginBottom: 16,
                }}
              >
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>

              <View style={{ gap: 14 }}>
                {items.map((prod, idx) => {
                  const imgSource =
                    getProductImageSource(prod, 100) ||
                    (prod.image ? { uri: optimizeCloudinaryUrl(prod.image, 100) } : null);
                  const packText = `${prod.unit || 'Standard'} × ${prod.qty || 1}`;

                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingBottom: idx !== items.length - 1 ? 14 : 0,
                        borderBottomWidth: idx !== items.length - 1 ? 1 : 0,
                        borderColor: '#f8fafc',
                      }}
                    >
                      {/* Thumbnail */}
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          backgroundColor: '#f8fafc',
                          borderWidth: 1,
                          borderColor: '#f1f5f9',
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        {imgSource && (
                          <Image
                            source={imgSource}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        )}
                      </View>

                      {/* Title and pack size */}
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontFamily: fonts.bold,
                            fontSize: 14.5,
                            fontWeight: '800',
                            color: '#0f172a',
                          }}
                        >
                          {prod.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: fonts.medium,
                            fontSize: 12,
                            fontWeight: '500',
                            color: '#64748b',
                            marginTop: 2,
                          }}
                        >
                          {packText}
                        </Text>
                      </View>

                      {/* Price */}
                      <Text
                        style={{
                          fontFamily: fonts.extraBold,
                          fontSize: 15,
                          fontWeight: '900',
                          color: '#0f172a',
                        }}
                      >
                        ₹{prod.price || prod.offerPrice || 0}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* CARD 2: BILL SUMMARY matching Image 4 */}
          <Animated.View entering={FadeInDown.duration(300).delay(120)}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 15.5,
                  fontWeight: '900',
                  color: '#0f172a',
                  marginBottom: 14,
                }}
              >
                Bill summary
              </Text>

              <View style={{ gap: 10 }}>
                {/* Item total */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: '#64748b',
                    }}
                  >
                    Item total
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 12.5,
                        color: '#94a3b8',
                        textDecorationLine: 'line-through',
                        marginRight: 6,
                      }}
                    >
                      ₹283
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        fontWeight: '800',
                        color: '#0f172a',
                      }}
                    >
                      ₹{orderTotal}
                    </Text>
                  </View>
                </View>

                {/* Delivery fee */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: '#64748b',
                    }}
                  >
                    Delivery fee
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13.5,
                      fontWeight: '800',
                      color: '#047857',
                    }}
                  >
                    FREE
                  </Text>
                </View>

                {/* Dotted separator */}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: '#e2e8f0',
                    paddingTop: 12,
                    marginTop: 2,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.extraBold,
                      fontSize: 15,
                      fontWeight: '900',
                      color: '#0f172a',
                    }}
                  >
                    Paid
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.extraBold,
                      fontSize: 16.5,
                      fontWeight: '900',
                      color: '#0f172a',
                    }}
                  >
                    ₹{orderTotal}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* CARD 3: ADDRESS & PAYMENT DETAILS matching Image 4 */}
          <Animated.View entering={FadeInDown.duration(300).delay(180)}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
                gap: 16,
              }}
            >
              {/* Delivery address row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MapPin size={18} color="#047857" strokeWidth={2.4} style={{ marginRight: 10, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#0f172a',
                    }}
                  >
                    Delivering to Home
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 12.5,
                      fontWeight: '500',
                      color: '#64748b',
                      marginTop: 1,
                    }}
                  >
                    {address}
                  </Text>
                </View>
              </View>

              {/* Payment method row */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <CreditCard size={18} color="#047857" strokeWidth={2.4} style={{ marginRight: 10, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 14,
                      fontWeight: '800',
                      color: '#0f172a',
                    }}
                  >
                    Paid by UPI app
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 12.5,
                      fontWeight: '500',
                      color: '#64748b',
                      marginTop: 1,
                    }}
                  >
                    Transaction [{order?.id?.slice(0, 8) || 'ID'}]
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* BOTTOM ACTION BUTTONS: Cancel order & Get help exactly matching Image 4 */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            {canCancel && (
              <Pressable
                onPress={() => setShowCancelModal(true)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#fecaca',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 14.5,
                    fontWeight: '800',
                    color: '#b91c1c',
                  }}
                >
                  Cancel order
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() =>
                navigation.navigate('HelpSupport', {
                  orderId: order?.id || orderId,
                  orderNo: displayOrderNo,
                })
              }
              style={{
                flex: 1,
                height: 48,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 14.5,
                  fontWeight: '800',
                  color: '#0f172a',
                }}
              >
                Get help
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* CANCEL ORDER BOTTOM SHEET / MODAL exactly matching Image 5 */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 28,
            }}
          >
            {/* Modal Title matching Image 5 */}
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 21,
                fontWeight: '900',
                color: '#0f172a',
                letterSpacing: -0.3,
              }}
            >
              Cancel order #{displayOrderNo}?
            </Text>
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13.5,
                fontWeight: '500',
                color: '#64748b',
                marginTop: 4,
                marginBottom: 18,
              }}
            >
              Tell us why so we can do better.
            </Text>

            {/* Reasons List with Radio Circles matching Image 5 */}
            <View style={{ gap: 10, marginBottom: 14 }}>
              {CANCEL_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setSelectedReason(reason)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#047857' : '#e2e8f0',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {/* Radio circle matching Image 5 */}
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: isSelected ? '#047857' : '#cbd5e1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}
                    >
                      {isSelected && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#047857',
                          }}
                        />
                      )}
                    </View>

                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0f172a',
                      }}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Refund banner matching Image 5 */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f0fdf4',
                borderRadius: 14,
                padding: 13,
                marginBottom: 20,
              }}
            >
              <RotateCcw size={16} color="#047857" strokeWidth={2.4} style={{ marginRight: 10 }} />
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13,
                  color: '#166534',
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontWeight: '800' }}>₹{orderTotal}</Text> will be refunded to your UPI app.
              </Text>
            </View>

            {/* Bottom buttons: Keep order & Cancel order matching Image 5 */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setShowCancelModal(false)}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#0f172a',
                  }}
                >
                  Keep order
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCancelOrder}
                disabled={cancelling}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 16,
                  backgroundColor: '#ebdada',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 15,
                    fontWeight: '800',
                    color: '#6c3e3e',
                  }}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel order'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
