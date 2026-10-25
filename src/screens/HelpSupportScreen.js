import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  CreditCard,
  Truck,
  User,
  Phone,
  MessageSquare,
  Check,
  X,
  Package,
} from '../components/icons';
import { Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { getProductImageSource } from '../utils/productImages';

const SUPPORT_PHONE = '+919037655180';
const SUPPORT_PHONE_DISPLAY = '+91 90376 55180';

const FAQ_ITEMS = [
  {
    id: 1,
    question: 'An item is missing from my order',
    answer: 'Open the order and tap Report an issue. Choose the missing item and we will refund or redeliver it.',
    topic: 'Order issues',
  },
  {
    id: 2,
    question: 'When will I get my refund?',
    answer: 'Refunds start as soon as they are approved and reach your account according to the payment provider’s processing time; contact support for an update.',
    topic: 'Payments & refunds',
  },
  {
    id: 3,
    question: 'Can I change my delivery address?',
    answer: 'You can change the address before the order is packed. After that, contact us and we will help.',
    topic: 'Delivery',
  },
  {
    id: 4,
    question: 'How does MS Club work?',
    answer: 'MS Club gives you free delivery on every order and extra savings on bulk packs for a monthly fee.',
    topic: 'Account & MS Club',
  },
];

const TOPICS = [
  { id: 'orders', title: 'Order issues', Icon: ShoppingBag, targetFaq: 1 },
  { id: 'payments', title: 'Payments & refunds', Icon: CreditCard, targetFaq: 2 },
  { id: 'delivery', title: 'Delivery', Icon: Truck, targetFaq: 3 },
  { id: 'account', title: 'Account & MS Club', Icon: User, targetFaq: 4 },
];

export default function HelpSupportScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { orderId: paramOrderId, orderNo: paramOrderNo } = route.params || {};

  const [orders, setOrders] = useState([]);
  const [recentOrder, setRecentOrder] = useState(null);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState(1); // First item opened by default matching Image 3

  useEffect(() => {
    // Fetch user orders via /orders/mine to prevent 403 Forbidden
    apiClient
      .get('/orders/mine')
      .then(({ data }) => {
        const list = data.items || [];
        setOrders(list);
        if (paramOrderId) {
          const match = list.find((o) => o.id === paramOrderId || o.orderNo === paramOrderNo);
          if (match) {
            setRecentOrder(match);
            return;
          }
        }
        if (list.length > 0) {
          setRecentOrder(list[0]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load user orders:', err);
      });
  }, [paramOrderId, paramOrderNo]);

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Toast.show({ type: 'info', text1: `Call support: ${SUPPORT_PHONE_DISPLAY}` });
    });
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(recentOrder ? `Hello MS Traders Support, I need help with order #${recentOrder.orderNo}.` : 'Hello MS Traders Support, I need help with my account.');
    Linking.openURL(`https://wa.me/919037655180?text=${text}`).catch(() => {
      Toast.show({ type: 'info', text1: `WhatsApp: ${SUPPORT_PHONE_DISPLAY}` });
    });
  };

  const toggleFaq = (id) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const orderNo = recentOrder?.orderNo;
  const orderTotal = recentOrder?.total ?? recentOrder?.totalAmount ?? 0;
  const items = recentOrder?.items || [];
  const itemCount = items.reduce((acc, it) => acc + (it.qty || 1), 0);
  const firstItem = items[0] || {};
  const firstItemImg = getProductImageSource(firstItem);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* HEADER */}
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
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
          Help & support
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 85,
          gap: 20,
        }}
      >
        {/* RECENT ORDER SECTION matching Image 3 */}
        {recentOrder ? <Animated.View entering={FadeInDown.duration(280)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '900',
                color: '#64748b',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              Recent order
            </Text>
            {orders.length > 1 && (
              <Pressable
                onPress={() => setShowOrderPicker(true)}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>
                  Change order
                </Text>
                <ChevronDown size={14} color="#047857" strokeWidth={2.4} />
              </Pressable>
            )}
          </View>

          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Top row with thumbnail and summary */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
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
                {firstItemImg ? (
                  <Image
                    source={firstItemImg}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                ) : (
                  <ShoppingBag size={22} color="#94a3b8" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>
                  Order #{orderNo}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                  {itemCount} items · ₹{orderTotal} · {recentOrder?.createdAt ? new Date(recentOrder.createdAt).toLocaleDateString() : recentOrder?.status}
                </Text>
              </View>
            </View>

            {/* Action buttons inside card */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() =>
                  navigation.navigate('ReportIssue', {
                    orderId: recentOrder?.id || paramOrderId,
                    orderNo,
                    order: recentOrder,
                  })
                }
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#047857',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                  Report an issue
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  navigation.navigate('OrderDetail', {
                    orderId: recentOrder?.id || paramOrderId,
                    orderNo,
                  })
                }
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                  Order details
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View> : <View style={{ padding: 18, backgroundColor: '#f0fdf4', borderRadius: 16 }}><Text style={{ color: '#047857', fontWeight: '700' }}>No orders yet</Text><Text style={{ color: '#64748b', marginTop: 6 }}>Your orders will appear here after your first purchase. You can still contact us for help.</Text></View>}

        {/* BROWSE TOPICS SECTION matching Image 3 (2x2 grid) */}
        <Animated.View entering={FadeInDown.duration(320)}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '900',
              color: '#64748b',
              letterSpacing: 0.8,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Browse topics
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {TOPICS.map((topic) => {
              const { id, title, Icon, targetFaq } = topic;
              return (
                <Pressable
                  key={id}
                  onPress={() => setExpandedFaqId(targetFaq)}
                  style={{
                    width: '48%',
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: '#ecfdf5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Icon size={20} color="#059669" strokeWidth={2.2} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                    {title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* COMMON QUESTIONS SECTION matching Image 3 Accordion */}
        <Animated.View entering={FadeInDown.duration(360)}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '900',
              color: '#64748b',
              letterSpacing: 0.8,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            Common questions
          </Text>

          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = expandedFaqId === item.id;
              const isLast = index === FAQ_ITEMS.length - 1;
              return (
                <View
                  key={item.id}
                  style={{
                    borderBottomWidth: isLast ? 0 : 1,
                    borderColor: '#f1f5f9',
                  }}
                >
                  <Pressable
                    onPress={() => toggleFaq(item.id)}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: '800',
                        color: '#0f172a',
                        flex: 1,
                        paddingRight: 10,
                      }}
                    >
                      {item.question}
                    </Text>
                    {isOpen ? (
                      <ChevronUp size={20} color="#0f172a" strokeWidth={2.2} />
                    ) : (
                      <ChevronDown size={20} color="#64748b" strokeWidth={2.2} />
                    )}
                  </Pressable>

                  {isOpen && (
                    <View
                      style={{
                        paddingHorizontal: 18,
                        paddingBottom: 18,
                        paddingTop: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13.5,
                          lineHeight: 20,
                          color: '#475569',
                          fontWeight: '500',
                        }}
                      >
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* STICKY BOTTOM ACTIONS: Call us & Chat with us matching Image 3 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 10,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          gap: 12,
        }}
      >
        {/* CALL US */}
        <Pressable
          onPress={handleCall}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 16,
            backgroundColor: '#ffffff',
            borderWidth: 1.5,
            borderColor: '#e2e8f0',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Phone size={18} color="#0f172a" strokeWidth={2.4} />
          <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
            Call us
          </Text>
        </Pressable>

        {/* CHAT WITH US */}
        <Pressable
          onPress={handleWhatsApp}
          style={{
            flex: 1.3,
            height: 50,
            borderRadius: 16,
            backgroundColor: '#047857',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <MessageSquare size={18} color="#ffffff" strokeWidth={2.4} />
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff' }}>
            Chat with us
          </Text>
        </Pressable>
      </View>

      {/* ORDER SELECTION MODAL */}
      <Modal
        visible={showOrderPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOrderPicker(false)}
      >
        <Pressable
          onPress={() => setShowOrderPicker(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '75%',
              paddingBottom: Math.max(insets.bottom, 16) + 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderColor: '#f1f5f9',
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                Select order to report
              </Text>
              <Pressable
                onPress={() => setShowOrderPicker(false)}
                hitSlop={10}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#64748b" strokeWidth={2.4} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {orders.map((o) => {
                const isSelected =
                  (recentOrder?.id && o.id === recentOrder?.id) ||
                  (recentOrder?.orderNo && o.orderNo === recentOrder?.orderNo);
                const oItems = o.items || [];
                const firstItm = oItems[0] || {};
                const itmImg = getProductImageSource(firstItm);
                const count = oItems.reduce((acc, it) => acc + (it.qty || 1), 0) || oItems.length;

                return (
                  <Pressable
                    key={o.id || o.orderNo}
                    onPress={() => {
                      setRecentOrder(o);
                      setShowOrderPicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#047857' : '#f1f5f9',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                    }}
                  >
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
                      {itmImg ? (
                        <Image source={itmImg} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                      ) : (
                        <ShoppingBag size={20} color="#94a3b8" />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>
                        Order #{o.orderNo}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                        {count} items · ₹{o.total || o.totalAmount} · {o.status || 'Placed'}
                      </Text>
                    </View>

                    {isSelected && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: '#047857',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
