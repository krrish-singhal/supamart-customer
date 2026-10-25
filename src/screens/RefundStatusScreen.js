import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Phone,
  MessageSquare,
  AlertTriangle,
  ShoppingBag,
  Camera,
  RotateCcw,
} from '../components/icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { doc, onSnapshot, collection, query, where } from '../services/reads';
import { db, auth } from '../config/firebase';
import apiClient from '../services/api';
import { getProductImageSource } from '../utils/productImages';
import Toast from 'react-native-toast-message';

const SHOP_PHONE = '+919037655180';
const SHOP_PHONE_DISPLAY = '+91 90376 55180';

const ISSUE_OPTIONS = [
  'Missing item',
  'Damaged',
  'Wrong item',
  'Expired / poor quality',
  'Cancelled order',
  'Other',
];

export default function RefundStatusScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    orderId: paramOrderId,
    orderNo: paramOrderNo,
    order: initialOrder,
    refund: initialRefund,
  } = route.params || {};

  // Selected order state
  const [selectedOrder, setSelectedOrder] = useState(initialOrder || null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(!initialOrder);
  const [refundsMap, setRefundsMap] = useState({});

  // Refund state for selected order
  const [refund, setRefund] = useState(initialRefund || null);
  const [loadingRefund, setLoadingRefund] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // Form states for creating a refund request
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [otherReasonModal, setOtherReasonModal] = useState(false);
  const [otherReasonText, setOtherReasonText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch user orders from /orders/mine and active refunds from /refunds
  useEffect(() => {
    let isMounted = true;

    async function fetchOrdersAndRefunds() {
      try {
        setLoadingOrders(true);
        const [ordersRes, refundsRes] = await Promise.all([
          apiClient.get('/orders/mine').catch(() => ({ data: { items: [] } })),
          apiClient.get('/refunds').catch(() => ({ data: { items: [] } })),
        ]);

        if (!isMounted) return;

        const orderList = ordersRes.data?.items || [];
        setOrders(orderList);

        const refundList = refundsRes.data?.items || [];
        const map = {};
        refundList.forEach((r) => {
          if (r.orderId) map[r.orderId] = r;
        });
        setRefundsMap(map);

        // If an orderId was passed as a route param but no full order was passed, locate it
        if (!selectedOrder && paramOrderId) {
          const match = orderList.find((o) => o.id === paramOrderId || o.orderNo === paramOrderNo);
          if (match) {
            setSelectedOrder(match);
            if (map[match.id]) setRefund(map[match.id]);
          }
        }
      } catch (err) {
        console.warn('Failed to load orders for refunds:', err);
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    }

    fetchOrdersAndRefunds();

    return () => {
      isMounted = false;
    };
  }, [paramOrderId, paramOrderNo]);

  // 2. Set up real-time listener for the selected order's refund document
  useEffect(() => {
    if (!selectedOrder?.id) return;

    setLoadingRefund(true);
    let unsub = null;

    // Listen in real-time to refunds matching this orderId
    const currentUid = auth?.currentUser?.uid || selectedOrder.userId;
    const q = currentUid
      ? query(collection(db, 'refunds'), where('userId', '==', currentUid), where('orderId', '==', selectedOrder.id))
      : query(collection(db, 'refunds'), where('orderId', '==', selectedOrder.id));

    unsub = onSnapshot(
      q,
      (snapshot) => {
        setLoadingRefund(false);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = { id: docSnap.id, ...docSnap.data() };
          setRefund(data);
          // Also update the map
          setRefundsMap((prev) => ({ ...prev, [selectedOrder.id]: data }));
        } else {
          setRefund(null);
        }
      },
      (_err) => {
        // Fall back gracefully to data from apiClient without spamming console
        setLoadingRefund(false);
      }
    );

    // Default select all items when order is selected if no refund exists yet
    if (selectedOrder.items?.length > 0) {
      setSelectedItemIds(selectedOrder.items.map((_, i) => i));
    }

    return () => {
      if (unsub) unsub();
    };
  }, [selectedOrder?.id]);

  // Handlers for Form
  const toggleItem = (idx) => {
    setSelectedItemIds((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadingPhoto(true);

        try {
          const uploadData = new FormData();
          uploadData.append('photo', {
            uri: asset.uri,
            name: 'refund_proof.jpg',
            type: asset.mimeType || 'image/jpeg',
          });

          const { data } = await apiClient.post('/issues/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
          });

          if (data?.url) {
            setPhotos((prev) => [...prev, data.url]);
          } else {
            setPhotos((prev) => [...prev, asset.uri]);
          }
        } catch (_uploadErr) {
          setPhotos((prev) => [...prev, asset.uri]);
        } finally {
          setUploadingPhoto(false);
        }
      }
    } catch (_e) {
      Toast.show({ type: 'error', text1: 'Could not open photo gallery' });
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = selectedItemIds.length > 0 && selectedIssue.trim().length > 0;

  const handleSubmitRefundRequest = async () => {
    if (!selectedOrder?.id || !isFormValid || submitting) return;
    setSubmitting(true);

    try {
      const orderItems = selectedOrder.items || [];
      const affectedItems = selectedItemIds.map((idx) => {
        const it = orderItems[idx] || {};
        return {
          name: it.name || 'Product',
          unit: it.unit || it.variantLabel || '',
          qty: it.qty || 1,
          price: it.price || 0,
        };
      });

      const resolvedReason =
        selectedIssue === 'Other' && otherReasonText.trim()
          ? `Other: ${otherReasonText.trim()}`
          : selectedIssue + (description ? `: ${description}` : '');
      const resolvedIssueType =
        selectedIssue === 'Other' && otherReasonText.trim()
          ? `Other: ${otherReasonText.trim()}`
          : selectedIssue;
      const resolvedDesc = otherReasonText.trim()
        ? description
          ? `${otherReasonText.trim()}\n${description}`
          : otherReasonText.trim()
        : description;

      const { data } = await apiClient.post('/refunds', {
        orderId: selectedOrder.id,
        reason: resolvedReason,
        refundTo: 'UPI app',
        affectedItems,
        issueType: resolvedIssueType,
        photos,
        description: resolvedDesc,
      });

      Toast.show({
        type: 'success',
        text1: 'Refund request submitted',
        text2: 'Shop owner will review and decide the refund promptly.',
      });

      if (data) {
        setRefund(data);
        setRefundsMap((prev) => ({ ...prev, [selectedOrder.id]: data }));
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Failed to submit refund request. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${SHOP_PHONE}`).catch(() => {
      Toast.show({ type: 'info', text1: `Call shop: ${SHOP_PHONE_DISPLAY}` });
    });
  };

  const handleWhatsApp = () => {
    const orderNoStr = refund?.orderNo || selectedOrder?.orderNo || 'N/A';
    const text = encodeURIComponent(
      `Hello MS Traders, I am inquiring regarding the refund for Order #${orderNoStr}.`
    );
    Linking.openURL(`https://wa.me/919037655180?text=${text}`).catch(() => {
      Toast.show({ type: 'info', text1: `WhatsApp: ${SHOP_PHONE_DISPLAY}` });
    });
  };

  const handleDismissRejection = async () => {
    setDismissing(true);
    try {
      if (refund?.id) {
        await apiClient.patch(`/refunds/${refund.id}/dismiss`).catch(() => {});
      }
      Toast.show({ type: 'info', text1: 'Refund request case closed' });
      setSelectedOrder(null);
      setRefund(null);
    } catch (_e) {
      setSelectedOrder(null);
      setRefund(null);
    } finally {
      setDismissing(false);
    }
  };

  // Helper values for display
  const displayOrderNo = refund?.orderNo || selectedOrder?.orderNo || paramOrderNo || 'N/A';
  const totalRefund = refund?.totalRefund ?? selectedOrder?.totalAmount ?? selectedOrder?.total ?? 0;
  const refundStatus = refund?.status || 'PENDING_APPROVAL';
  const isRejected = refundStatus === 'REJECTED';
  const isGranted = refundStatus === 'REFUND_GRANTED';

  const orderItems = selectedOrder?.items || [
    { name: 'Toor Dal (Unpolished)', unit: '1 kg', qty: 1, price: 158 },
    { name: 'Full Cream Milk', unit: '500 ml', qty: 2, price: 66 },
    { name: 'Tomato (Local)', unit: '500 g', qty: 1, price: 22 },
  ];

  const breakdownItems = refund?.items || refund?.affectedItems || orderItems;

  // -------------------------------------------------------------
  // STATE 1: SELECT ORDER VIEW (When user has not selected an order yet)
  // -------------------------------------------------------------
  if (!selectedOrder) {
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
            Refund Requests
          </Text>
        </View>

        {loadingOrders ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#047857" />
            <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14, fontWeight: '600' }}>
              Loading your orders...
            </Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <View
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: '#ecfdf5',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <RotateCcw size={32} color="#047857" strokeWidth={2.2} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>
              No orders found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#64748b',
                fontWeight: '500',
                textAlign: 'center',
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              {"You haven't placed any orders yet. Once you place an order, you can request refunds here."}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: '#047857',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14.5 }}>
                Start shopping
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40,
              gap: 14,
            }}
          >
            <Animated.View entering={FadeInDown.duration(280)}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 12,
                }}
              >
                Select an order to proceed
              </Text>
            </Animated.View>

            {orders.map((ord, idx) => {
              const existingRefund = refundsMap[ord.id];
              const ordItems = ord.items || [];
              const itemCount = ordItems.reduce((acc, it) => acc + (it.qty || 1), 0) || ordItems.length;
              const ordTotal = ord.total || ord.totalAmount || 0;
              const firstItm = ordItems[0] || {};
              const itmImg = getProductImageSource(firstItm);

              return (
                <Animated.View key={ord.id || idx} entering={FadeInDown.duration(300).delay(idx * 40)}>
                  <Pressable
                    onPress={() => {
                      setSelectedOrder(ord);
                      if (existingRefund) {
                        setRefund(existingRefund);
                      }
                    }}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: existingRefund ? '#a7f3d0' : '#f1f5f9',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
                          marginRight: 14,
                        }}
                      >
                        {itmImg ? (
                          <Image
                            source={itmImg}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="contain"
                          />
                        ) : (
                          <ShoppingBag size={22} color="#94a3b8" />
                        )}
                      </View>

                      {/* Summary */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>
                            Order #{ord.orderNo}
                          </Text>
                          <ChevronRight size={18} color="#94a3b8" />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 3 }}>
                          {itemCount} items · ₹{ordTotal}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderColor: '#f8fafc',
                      }}
                    >
                      {existingRefund ? (
                        <View
                          style={{
                            backgroundColor:
                              existingRefund.status === 'REFUND_GRANTED'
                                ? '#dcfce7'
                                : existingRefund.status === 'REJECTED'
                                ? '#fee2e2'
                                : '#fef3c7',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11.5,
                              fontWeight: '900',
                              color:
                                existingRefund.status === 'REFUND_GRANTED'
                                  ? '#15803d'
                                  : existingRefund.status === 'REJECTED'
                                  ? '#b91c1c'
                                  : '#b45309',
                              letterSpacing: 0.5,
                            }}
                          >
                            {existingRefund.status === 'REFUND_GRANTED'
                              ? `REFUND GRANTED · ₹${existingRefund.totalRefund}`
                              : existingRefund.status === 'REJECTED'
                              ? 'REFUND REJECTED'
                              : 'REFUND PENDING APPROVAL'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#047857' }}>
                          Tap to request refund
                        </Text>
                      )}

                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8' }}>
                        {ord.status || 'Placed'}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: REFUND REQUEST FORM VIEW (When order is selected but no refund exists)
  // -------------------------------------------------------------
  if (!refund) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* HEADER matching Image 2 */}
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
              onPress={() => setSelectedOrder(null)}
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

            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                Refund Requests
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 1 }}>
                Order #{displayOrderNo}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setSelectedOrder(null)}
            hitSlop={8}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: '#f1f5f9',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>
              Change
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 95,
            gap: 20,
          }}
        >
          {/* 1. SELECT AFFECTED ITEMS matching Image 2 */}
          <Animated.View entering={FadeInDown.duration(280)}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
              1. Select affected items
            </Text>

            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              {orderItems.map((item, idx) => {
                const isSelected = selectedItemIds.includes(idx);
                const imgSource = getProductImageSource(item);
                const isLast = idx === orderItems.length - 1;

                return (
                  <Pressable
                    key={idx}
                    onPress={() => toggleItem(idx)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderColor: '#f1f5f9',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
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
                        marginRight: 14,
                      }}
                    >
                      {imgSource ? (
                        <Image
                          source={imgSource}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="contain"
                        />
                      ) : (
                        <ShoppingBag size={20} color="#94a3b8" />
                      )}
                    </View>

                    {/* Title & Unit x Qty */}
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                        {item.unit || item.variantLabel || '1 unit'} × {item.qty || 1}
                      </Text>
                    </View>

                    {/* Checkbox */}
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isSelected ? '#047857' : '#cbd5e1',
                        backgroundColor: isSelected ? '#047857' : '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* 2. WHAT WENT WRONG? matching Image 2 */}
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
              2. What went wrong?
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {ISSUE_OPTIONS.map((opt) => {
                const isSelected = selectedIssue === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setSelectedIssue(opt);
                      if (opt === 'Other') {
                        setOtherReasonModal(true);
                      }
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#047857' : '#e2e8f0',
                      backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13.5,
                        fontWeight: isSelected ? '800' : '700',
                        color: isSelected ? '#047857' : '#0f172a',
                      }}
                    >
                      {opt === 'Other' && otherReasonText.trim()
                        ? `Other: ${otherReasonText.trim().slice(0, 22)}${otherReasonText.trim().length > 22 ? '…' : ''}`
                        : opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* 3. ADD PHOTOS matching Image 2 */}
          <Animated.View entering={FadeInDown.duration(320)}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
              3. Add photos{' '}
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748b' }}>
                (helps us resolve faster)
              </Text>
            </Text>

            {/* Dotted upload box */}
            <Pressable
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
              style={{
                borderWidth: 1.5,
                borderColor: '#6ee7b7',
                borderStyle: 'dashed',
                borderRadius: 18,
                backgroundColor: '#f0fdf4',
                paddingVertical: 26,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#047857" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Camera size={20} color="#047857" strokeWidth={2.4} />
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#047857' }}>
                    Upload photos
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Photos preview list */}
            {photos.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {photos.map((uri, i) => (
                  <View
                    key={i}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      overflow: 'hidden',
                      position: 'relative',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                    }}
                  >
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    <Pressable
                      onPress={() => handleRemovePhoto(i)}
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        borderRadius: 10,
                        width: 18,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={12} color="#ffffff" strokeWidth={2.6} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Optional description input */}
            <TextInput
              placeholder="Describe the issue (optional)"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
                color: '#0f172a',
                minHeight: 76,
                textAlignVertical: 'top',
              }}
            />
          </Animated.View>

          {/* 4. HOW SHOULD WE FIX IT? Single fixed option matching user prompt */}
          <Animated.View entering={FadeInDown.duration(340)}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
              4. How should we fix it?
            </Text>

            <View
              style={{
                backgroundColor: '#f0fdf4',
                borderWidth: 1.5,
                borderColor: '#047857',
                borderRadius: 18,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* Radio circle */}
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: '#047857',
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                  Refund to original payment
                </Text>
                <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                  UPI app
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* BOTTOM STICKY BUTTON: Request Refund matching Image 2 */}
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
          }}
        >
          <Pressable
            onPress={handleSubmitRefundRequest}
            disabled={!isFormValid || submitting}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: isFormValid ? '#047857' : '#d1dcd4',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: isFormValid ? '#047857' : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isFormValid ? 0.25 : 0,
              shadowRadius: 8,
              elevation: isFormValid ? 3 : 0,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 15.5,
                  fontWeight: '900',
                  color: isFormValid ? '#ffffff' : '#546e5a',
                }}
              >
                {isFormValid ? 'Request Refund' : 'Select an Item and Issue'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Modal for "Other" refund reason */}
        <Modal
          visible={otherReasonModal}
          transparent
          animationType="fade"
          onRequestClose={() => setOtherReasonModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 380,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                  Specify Reason
                </Text>
                <Pressable
                  onPress={() => setOtherReasonModal(false)}
                  hitSlop={8}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={15} color="#64748b" strokeWidth={2.4} />
                </Pressable>
              </View>

              <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 }}>
                Please provide details about what was wrong with the items for the shop admin.
              </Text>

              <TextInput
                multiline
                numberOfLines={4}
                value={otherReasonText}
                onChangeText={setOtherReasonText}
                placeholder="e.g. Received incorrect variant, broken seal, expired..."
                placeholderTextColor="#94a3b8"
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  padding: 12,
                  fontSize: 13.5,
                  color: '#0f172a',
                  textAlignVertical: 'top',
                  minHeight: 90,
                  marginBottom: 16,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setOtherReasonModal(false)}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!otherReasonText.trim()) {
                      Toast.show({ type: 'info', text1: 'Please enter a brief reason' });
                      return;
                    }
                    setSelectedIssue('Other');
                    setOtherReasonModal(false);
                  }}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 12,
                    backgroundColor: '#047857',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Save Reason</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // STATE 3: REAL-TIME REFUND STATUS VIEW (When refund document exists)
  // -------------------------------------------------------------
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
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => {
              if (initialOrder || paramOrderId) {
                navigation.goBack();
              } else {
                setSelectedOrder(null);
                setRefund(null);
              }
            }}
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
            Refund Requests
          </Text>
        </View>

        <Pressable
          onPress={() => {
            setSelectedOrder(null);
            setRefund(null);
          }}
          hitSlop={8}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: '#f1f5f9',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#047857' }}>
            Change
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 85,
          gap: 14,
        }}
      >
        {/* TOP HERO AMOUNT CARD matching Image 1 & 2 */}
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 22,
            paddingVertical: 24,
            paddingHorizontal: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>
            Refund for order #{displayOrderNo}
          </Text>
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>
            ₹{totalRefund}
          </Text>

          {/* REAL-TIME STATUS BADGE */}
          {isRejected ? (
            <View
              style={{
                backgroundColor: '#fee2e2',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#b91c1c', fontSize: 12.5, fontWeight: '900', letterSpacing: 0.6 }}>
                REFUND REJECTED
              </Text>
            </View>
          ) : isGranted ? (
            <View
              style={{
                backgroundColor: '#dcfce7',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#15803d', fontSize: 12.5, fontWeight: '900', letterSpacing: 0.6 }}>
                REFUND GRANTED
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: '#fef3c7',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 12,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#b45309', fontSize: 12.5, fontWeight: '900', letterSpacing: 0.6 }}>
                REFUND PENDING APPROVAL
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', textAlign: 'center' }}>
            {isRejected
              ? 'Case reviewed and rejected by shop admin'
              : isGranted
              ? 'Money refunded manually by shop owner via UPI'
              : 'Expected in your account upon shop owner approval'}
          </Text>
        </Animated.View>

        {/* REJECTION CARD WITH REASON & CONTACT BUTTONS */}
        {isRejected && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 20,
              padding: 18,
              borderWidth: 1.5,
              borderColor: '#fca5a5',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
              <AlertTriangle size={20} color="#b91c1c" strokeWidth={2.4} />
              <Text style={{ fontSize: 15.5, fontWeight: '900', color: '#991b1b' }}>
                Refund Request Rejected
              </Text>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: '#7f1d1d', marginBottom: 4 }}>
              Reason given by shop admin:
            </Text>
            <View
              style={{
                backgroundColor: '#ffffff',
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#fecaca',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 13.5, color: '#334155', fontWeight: '600' }}>
                {refund?.rejectReason || 'Order could not be verified for refund.'}
              </Text>
            </View>

            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748b', marginBottom: 10 }}>
              Need clarification? Contact shop owner directly:
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <Pressable
                onPress={handleCall}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Phone size={16} color="#0f172a" strokeWidth={2.2} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                  Call Shop
                </Text>
              </Pressable>

              <Pressable
                onPress={handleWhatsApp}
                style={{
                  flex: 1,
                  backgroundColor: '#047857',
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <MessageSquare size={16} color="#ffffff" strokeWidth={2.2} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                  WhatsApp
                </Text>
              </Pressable>
            </View>

            {/* Close / Dismiss button */}
            <Pressable
              onPress={handleDismissRejection}
              disabled={dismissing}
              style={{
                backgroundColor: '#ef4444',
                paddingVertical: 11,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#ffffff' }}>
                {dismissing ? 'Closing...' : 'Close Request Case'}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* 4-STEP REAL-TIME TIMELINE CARD */}
        <Animated.View
          entering={FadeInDown.duration(320)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {/* STEP 1: Order placed / Issue identified */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', marginRight: 14 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} color="#ffffff" strokeWidth={3} />
              </View>
              <View style={{ width: 2.5, height: 42, backgroundColor: '#047857' }} />
            </View>
            <View style={{ flex: 1, paddingTop: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                Refund request initiated
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
                Items submitted for verification
              </Text>
            </View>
          </View>

          {/* STEP 2: Under Review */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', marginRight: 14 }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#047857',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} color="#ffffff" strokeWidth={3} />
              </View>
              <View
                style={{
                  width: 2.5,
                  height: 42,
                  backgroundColor: isRejected ? '#ef4444' : isGranted ? '#047857' : '#047857',
                }}
              />
            </View>
            <View style={{ flex: 1, paddingTop: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                Case assigned to shop admin
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
                Proof and details verified
              </Text>
            </View>
          </View>

          {/* STEP 3: Admin approval (MANUAL REAL-TIME) */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', marginRight: 14 }}>
              {isRejected ? (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: '#ef4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="#ffffff" strokeWidth={3} />
                </View>
              ) : isGranted ? (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: '#047857',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={16} color="#ffffff" strokeWidth={3} />
                </View>
              ) : (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 2.5,
                    borderColor: '#047857',
                    backgroundColor: '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#047857',
                    }}
                  />
                </View>
              )}
              <View
                style={{
                  width: 2.5,
                  height: 42,
                  backgroundColor: isGranted ? '#047857' : '#e2e8f0',
                }}
              />
            </View>
            <View style={{ flex: 1, paddingTop: 2 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: isRejected ? '#b91c1c' : '#0f172a',
                }}
              >
                Admin approval
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
                {isRejected
                  ? 'Request rejected by shop admin'
                  : isGranted
                  ? 'Approved by shop owner'
                  : 'Shop owner reviewing case in real-time'}
              </Text>
            </View>
          </View>

          {/* STEP 4: Money received (MANUAL) */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', marginRight: 14 }}>
              {isGranted ? (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: '#047857',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={16} color="#ffffff" strokeWidth={3} />
                </View>
              ) : (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 2,
                    borderColor: '#cbd5e1',
                    backgroundColor: '#ffffff',
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingTop: 2 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: isGranted ? '#0f172a' : '#64748b',
                }}
              >
                Money received
              </Text>
              <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
                {isGranted
                  ? 'Refund granted & sent manually via UPI'
                  : isRejected
                  ? 'Case closed'
                  : 'Awaiting shop owner transfer'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* REFUND BREAKDOWN CARD */}
        <Animated.View
          entering={FadeInDown.duration(340)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 14 }}>
            Refund breakdown
          </Text>

          <View style={{ gap: 14 }}>
            {breakdownItems.map((item, idx) => {
              const imgSource = getProductImageSource(item);
              const itemPrice = item.price ?? 0;
              const qty = item.qty || 1;
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
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
                        <Image
                          source={imgSource}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="contain"
                        />
                      ) : (
                        <ShoppingBag size={20} color="#94a3b8" />
                      )}
                    </View>
                    <Text
                      style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.name} × {qty}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0f172a' }}>
                    ₹{itemPrice * qty}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Dotted separator */}
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: '#e2e8f0',
              borderStyle: 'dashed',
              marginVertical: 16,
            }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 15.5, fontWeight: '900', color: '#0f172a' }}>
              Total refund
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#047857' }}>
              ₹{totalRefund}
            </Text>
          </View>
        </Animated.View>

        {/* METADATA CARD */}
        <Animated.View
          entering={FadeInDown.duration(360)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#64748b' }}>
              Refund to
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
              {refund?.refundTo || 'UPI app'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#64748b' }}>
              Refund reference
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
              {refund?.refundReference || `REF-${displayOrderNo}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#64748b' }}>
              Reason
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
              {refund?.reason || refund?.issueType || 'Refund requested'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* BOTTOM STICKY ACTION BUTTONS: Get help & Shop again */}
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
        <Pressable
          onPress={() =>
            navigation.navigate('HelpSupport', {
              orderId: selectedOrder?.id,
              orderNo: displayOrderNo,
            })
          }
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
          <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
            Get help
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          style={{
            flex: 1.2,
            height: 50,
            borderRadius: 16,
            backgroundColor: '#047857',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff' }}>
            Shop again
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
