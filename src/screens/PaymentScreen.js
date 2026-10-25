import useStoreStatus from '../hooks/useStoreStatus';
import { formatDeliveryAddress } from '../utils/addressForm';
import { orderEstimate } from '../utils/orderEstimate';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  AppState,
  ActivityIndicator,
  TextInput,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  X,
  CreditCard,
  Building2,
  Lock,
  Check,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  QrCode,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
} from '../components/icons';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot } from '../services/reads';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import { UPI_ID, UPI_PAYEE_NAME } from '../config/global';
import { useCart } from '../context/CartContext';
import { Image } from 'expo-image';
import * as Crypto from 'expo-crypto';
import { fonts } from '../theme/typography';
import { GPayBadge, PhonePeBadge, PaytmBadge, UpiBadge } from '../components/ui/PaymentAppBadge';

function buildUpiParams(amount, note) {
  const formatted = Number(amount || 0).toFixed(2);
  return `pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${formatted}&cu=INR&tn=${encodeURIComponent(note || 'MS Traders order')}`;
}

export default function PaymentScreen({ route, navigation }) {
  const { payload, idempotencyKey, amount, itemCount: paramItemCount } = route.params || {};
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState(() => idempotencyKey || Crypto.randomUUID());
  const insets = useSafeAreaInsets();
  const { loadCart } = useCart();
  const { isOpen: storeOpen } = useStoreStatus();

  // Mode: If opened from Profile/Account or Cart 'Change' link without active order payload
  const isDefaultSetupMode = !amount && !payload;

  // Track the user's selected default payment method
  const [defaultPayment, setDefaultPayment] = useState({
    type: 'UPI_APP',
    app: 'Google Pay',
    scheme: 'tez://upi/pay',
  });

  // Screen states: 'METHOD_SELECT' | 'AWAITING_PAYMENT_CONFIRMATION' | 'WAITING_APPROVAL' | 'SUCCESS' | 'FAILED'
  const [screenState, setScreenState] = useState('METHOD_SELECT');
  const [selectedMethod, setSelectedMethod] = useState('UPI_APP'); // 'UPI_APP' | 'UPI_ID'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [launchedApp, setLaunchedApp] = useState('UPI');
  const [launchedScheme, setLaunchedScheme] = useState(null);

  const [createdOrder, setCreatedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failureReason, setFailureReason] = useState('Declined by bank');

  // Confirmation modal and collapsible QR code states
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const appState = useRef(AppState.currentState);

  const note = 'MS Traders order';
  const formattedAmount = Number(amount || 0).toFixed(2);
  const upiParams = buildUpiParams(formattedAmount, note);
  const upiUri = `upi://pay?${upiParams}`;

  const itemCount = paramItemCount || payload?.cartItems?.length || 4;

  // Load existing default payment method from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('@supamart_default_payment_method').then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed?.app) {
            setDefaultPayment(parsed);
            if (parsed.type) {
              if (isDefaultSetupMode) {
                setSelectedMethod('UPI_APP');
              } else {
                setSelectedMethod(parsed.type);
              }
            }
            if (parsed.upiId) setUpiIdInput(parsed.upiId);
            if (parsed.app) setLaunchedApp(parsed.app);
            if (parsed.scheme) setLaunchedScheme(parsed.scheme);
          }
        } catch (e) {}
      }
    });
  }, []);

  // Intercept back button when payment is already settled or pending admin approval
  useEffect(() => {
    if (screenState === 'SUCCESS' || screenState === 'WAITING_APPROVAL') {
      const onBackPress = () => {
        navigation.navigate('Orders');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }
  }, [screenState, navigation]);

  // Real-time listener for the order's payment status
  useEffect(() => {
    if (!createdOrder?.id) return;

    const unsub = onSnapshot(
      doc(db, 'orders', createdOrder.id),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // 1. Admin clicked "Payment received" -> Show Image 3: Payment successful
        if (data.paymentStatus === 'PAID') {
          setScreenState('SUCCESS');
          loadCart(true, { force: true }).catch(() => {});
        }
        // 2. Admin clicked "Payment not received" -> Show Image 4: Payment failed
        else if (data.paymentStatus === 'FAILED' || (data.status === 'CANCELLED' && data.paymentStatus !== 'PAID')) {
          setFailureReason(data.paymentRejectionReason || 'Declined by store');
          setScreenState('FAILED');
        }
      },
      (err) => {
        console.error('Order payment status listener error:', err);
      }
    );

    return () => unsub();
  }, [createdOrder?.id, loadCart]);

  // Track AppState quietly on return without firing premature automated requests or confusing popups
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // Creates the order in Firestore and claims payment
  async function submitOrderAndClaimPayment() {
    if (loading) return;
    if (!payload && !amount) {
      setConfirmModalVisible(false);
      navigation.navigate('Main', { screen: 'Cart' });
      return;
    }
    setLoading(true);
    try {
      // 1. If an order was already created and is being retried, attempt to re-claim directly
      if (createdOrder?.id) {
        try {
          await apiClient.patch(`/orders/${createdOrder.id}/payment-claimed`);
          await loadCart(true, { force: true });
          setConfirmModalVisible(false);
          setScreenState('WAITING_APPROVAL');
          return;
        } catch (patchErr) {
          console.warn('Re-claiming on existing order failed, falling back to fresh placement:', patchErr);
        }
      }

      // 2. Otherwise submit order with active idempotency key
      const keyToSend = activeIdempotencyKey || Crypto.randomUUID();
      const { data } = await apiClient.post('/orders', payload, {
        headers: { 'X-Idempotency-Key': keyToSend },
      });
      const placedOrderId = data.id || data.orderId;
      setCreatedOrder({ ...data, id: placedOrderId });

      if (placedOrderId) {
        await apiClient.patch(`/orders/${placedOrderId}/payment-claimed`);
      }
      await loadCart(true, { force: true });

      setConfirmModalVisible(false);
      // Move immediately to "Wait for admin approval" state
      setScreenState('WAITING_APPROVAL');
    } catch (err) {
      console.error('Order placement error:', err);
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Could not place order',
        text2: 'Please try again or choose another payment method.',
      });
    } finally {
      setLoading(false);
    }
  }

  // Handle tapping an app in the direct UPI apps row
  function handleAppPress(targetScheme, appLabel) {
    if (isDefaultSetupMode) {
      // In default setup mode: NO URL opening, NO static toast messages!
      setSelectedMethod('UPI_APP');
      setDefaultPayment({
        type: 'UPI_APP',
        app: appLabel,
        scheme: targetScheme,
      });
      return;
    }
    openUpiPayment(targetScheme, appLabel);
  }

  // Save default payment method to AsyncStorage and return to previous screen
  async function handleSaveDefaultMethod() {
    try {
      const dataToSave = {
        type: selectedMethod,
        app: selectedMethod === 'UPI_ID' ? 'UPI ID' : (defaultPayment.app || 'UPI app'),
        scheme: selectedMethod === 'UPI_ID' ? null : defaultPayment.scheme,
        upiId: selectedMethod === 'UPI_ID' ? upiIdInput : undefined,
      };
      await AsyncStorage.setItem('@supamart_default_payment_method', JSON.stringify(dataToSave));
      Toast.show({
        type: 'success',
        text1: 'Default payment method set',
        text2: `${dataToSave.app} will be preselected at checkout.`,
      });
      navigation.goBack();
    } catch (e) {
      console.error('Failed to save default payment method:', e);
    }
  }

  // Handle opening specific UPI app with automatic fallback to generic chooser with prefilled amount
  async function openUpiPayment(targetScheme, appLabel) {
    if (isDefaultSetupMode) {
      handleAppPress(targetScheme, appLabel);
      return;
    }

    if (!storeOpen && !createdOrder?.id) {
      Toast.show({ type: 'info', text1: 'The shop is closed', text2: 'Order daily from 10 AM to 11 PM.' });
      return;
    }

    const currentFormattedAmount = Number(amount || 0).toFixed(2);
    const query = buildUpiParams(currentFormattedAmount, 'MS Traders order');
    const genericUri = `upi://pay?${query}`;

    let launched = false;

    if (targetScheme) {
      const specificUri = `${targetScheme}?${query}`;
      try {
        const canOpen = await Linking.canOpenURL(specificUri);
        if (canOpen) {
          await Linking.openURL(specificUri);
          launched = true;
        }
      } catch (err) {
        console.warn(`Could not open specific scheme ${targetScheme}:`, err);
      }
    }

    // Fallback: If specific scheme is not available or failed to open (e.g. Paytm selected but not installed)
    if (!launched) {
      try {
        const canOpenGeneric = await Linking.canOpenURL(genericUri);
        if (canOpenGeneric) {
          await Linking.openURL(genericUri);
          launched = true;
        } else {
          // Direct attempt on platforms where canOpenURL returns false for custom intent filters
          await Linking.openURL(genericUri);
          launched = true;
        }

        if (targetScheme) {
          Toast.show({
            type: 'info',
            text1: `${appLabel} is not installed`,
            text2: 'Opening available UPI apps so you can complete payment.',
          });
        }
      } catch (err) {
        console.warn('Failed to open generic UPI chooser:', err);
        Toast.show({
          type: 'info',
          text1: 'UPI redirection ready',
          text2: 'You can pay using any UPI app or scan the QR code.',
        });
      }
    }

    // Transition to awaiting return & user clicking "I have completed payment"
    setLaunchedApp(appLabel || 'UPI App');
    setLaunchedScheme(targetScheme || null);
    setScreenState('AWAITING_PAYMENT_CONFIRMATION');
  }

  // Handle primary action from METHOD_SELECT
  async function handlePayNow() {
    if (isDefaultSetupMode) {
      await handleSaveDefaultMethod();
      return;
    }
    if (selectedMethod === 'UPI_APP') {
      await openUpiPayment(defaultPayment.scheme, defaultPayment.app || 'UPI App');
    } else if (selectedMethod === 'UPI_ID') {
      await submitOrderAndClaimPayment();
    }
  }

  // =========================================================================
  // VIEW 1: PAYMENT SUCCESSFUL (matching Image 3)
  // =========================================================================
  if (screenState === 'SUCCESS') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center' }}>
            {/* Green Circle with White Checkmark matching Image 3 */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#047857',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
                marginBottom: 20,
              }}
            >
              <Check size={42} color="#ffffff" strokeWidth={3.8} />
            </View>

            {/* Price matching Image 3 */}
            <Text
              style={{
                fontSize: 28,
                fontFamily: fonts.black,
                fontWeight: 'normal',
                color: '#0f172a',
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              ₹{Number(amount).toFixed(0)}
            </Text>

            {/* Payment successful matching Image 3 */}
            <Text
              style={{
                fontSize: 18.5,
                fontFamily: fonts.extraBold,
                fontWeight: 'normal',
                color: '#0f172a',
                marginBottom: 4,
              }}
            >
              Payment successful
            </Text>

            {/* Store has confirmed your order matching Image 3 */}
            <Text
              style={{
                fontSize: 13.5,
                fontFamily: fonts.medium,
                fontWeight: 'normal',
                color: '#64748b',
                marginBottom: 16,
              }}
            >
              Store has confirmed your order
            </Text>

            {/* Green indicator line matching Image 3 */}
            <View
              style={{
                width: 140,
                height: 3,
                backgroundColor: '#047857',
                borderRadius: 2,
              }}
            />
          </Animated.View>
        </View>

        {/* BOTTOM BUTTON: View order confirmation matching Image 3 */}
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
          <Pressable
            onPress={() =>
              navigation.replace('OrderConfirmation', {
                orderId: createdOrder?.id,
                orderNo: createdOrder?.orderNo || '—',
                total: amount,
                items: createdOrder?.items || payload.cartItems,
                savings: createdOrder?.discount || 0,
                address: formatDeliveryAddress(payload.address),
                paymentMethod: 'UPI app',
                deliveryTime: orderEstimate(createdOrder) || 'View live order estimate',
              })
            }
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#047857',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 15.5, fontFamily: fonts.bold, fontWeight: 'normal', color: '#ffffff' }}>
              View order confirmation
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 2: PAYMENT FAILED (matching Image 4)
  // =========================================================================
  if (screenState === 'FAILED') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* Top-left X Close button matching Image 4 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 24,
            alignItems: 'center',
          }}
        >
          {/* Red X Badge matching Image 4 */}
          <Animated.View entering={FadeInDown.duration(350)} style={{ alignItems: 'center', width: '100%' }}>
            <View
              style={{
                width: 86,
                height: 86,
                borderRadius: 43,
                backgroundColor: '#fee2e2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: '#b91c1c',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={30} color="#ffffff" strokeWidth={3.5} />
              </View>
            </View>

            {/* Title matching Image 4 */}
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 22,
                fontWeight: 'normal',
                color: '#0f172a',
                marginBottom: 8,
              }}
            >
              Payment failed
            </Text>

            {/* Subtitle matching Image 4 */}
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13.5,
                fontWeight: 'normal',
                color: '#475569',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 24,
                paddingHorizontal: 8,
              }}
            >
              Your payment of <Text style={{ fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a' }}>₹{amount}</Text> didn&apos;t go through. Your order hasn&apos;t been placed yet and your cart is saved.
            </Text>

            {/* Info Card matching Image 4 */}
            <View
              style={{
                width: '100%',
                backgroundColor: '#f8fafc',
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>Reason</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>{failureReason}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>Method</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>UPI app</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>Reference</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>
                  [Transaction {createdOrder?.orderNo || 'ID'}]
                </Text>
              </View>
            </View>

            {/* Disclaimer note matching Image 4 */}
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 12,
                fontWeight: 'normal',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 18,
                paddingHorizontal: 16,
                marginBottom: 32,
              }}
            >
              If money was deducted, it will be refunded to your account within 3 to 5 working days.
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Bottom action buttons matching Image 4 */}
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 12, gap: 12 }}>
          {/* Retry payment button */}
          <Pressable
            onPress={() => {
              setActiveIdempotencyKey(Crypto.randomUUID());
              setScreenState('METHOD_SELECT');
              handlePayNow();
            }}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#047857',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <RefreshCw size={17} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15.5, fontWeight: 'normal', color: '#ffffff' }}>
              Retry payment
            </Text>
          </Pressable>

          {/* Choose another method */}
          <Pressable
            onPress={() => {
              setActiveIdempotencyKey(Crypto.randomUUID());
              setScreenState('METHOD_SELECT');
            }}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#ffffff',
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
              Choose another method
            </Text>
          </Pressable>

          {/* Need help? */}
          <Pressable
            onPress={() => {
              Linking.openURL('tel:919876543210').catch(() => {
                Toast.show({ type: 'info', text1: 'Support Helpline: +91 98765 43210' });
              });
            }}
            style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14.5, fontFamily: fonts.bold, fontWeight: 'normal', color: '#047857' }}>
              Need help?
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW: AWAITING PAYMENT CONFIRMATION (User pays in UPI app, then returns & clicks Complete Payment)
  // =========================================================================
  if (screenState === 'AWAITING_PAYMENT_CONFIRMATION') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* Top Header */}
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: '#f1f5f9',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => setScreenState('METHOD_SELECT')}
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

          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, fontWeight: 'normal', color: '#0f172a', letterSpacing: -0.3 }}>
              Confirm Payment
            </Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, fontWeight: 'normal', color: '#64748b', marginTop: 1 }}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · ₹{formattedAmount}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 180,
            gap: 14,
          }}
        >
          {/* Main Status & Amount Card */}
          <Animated.View
            entering={FadeInDown.duration(350)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
              alignItems: 'center',
            }}
          >
            {/* Calm status badge — NOT a spinning loading indicator */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ecfdf5',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#a7f3d0',
                marginBottom: 12,
                gap: 6,
              }}
            >
              <Clock size={13} color="#047857" strokeWidth={2.4} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 11, fontWeight: 'normal', color: '#047857', letterSpacing: 0.3 }}>
                COMPLETE PAYMENT IN {launchedApp?.toUpperCase() || 'UPI APP'}
              </Text>
            </View>

            {/* Large Amount */}
            <Text
              style={{
                fontFamily: fonts.black,
                fontSize: 34,
                fontWeight: 'normal',
                color: '#0f172a',
                letterSpacing: -0.8,
                marginBottom: 4,
              }}
            >
              ₹{formattedAmount}
            </Text>

            <Text
              style={{
                fontFamily: fonts.semiBold,
                fontSize: 13,
                fontWeight: 'normal',
                color: '#64748b',
                marginBottom: 14,
              }}
            >
              Prefilled in {launchedApp || 'UPI app'}
            </Text>

            <View
              style={{
                width: '100%',
                backgroundColor: '#f8fafc',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, fontWeight: 'normal', color: '#64748b' }}>Paying to</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>{UPI_PAYEE_NAME}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, fontWeight: 'normal', color: '#64748b' }}>UPI ID</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, fontWeight: 'normal', color: '#047857', flex: 1, textAlign: 'right', marginLeft: 8 }} numberOfLines={1}>
                  {UPI_ID}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Critical Payment Warning Banner Notice */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(80)}
            style={{
              backgroundColor: '#fffbeb',
              borderRadius: 18,
              padding: 16,
              borderWidth: 1.5,
              borderColor: '#fde68a',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#fcd34d',
              }}
            >
              <AlertTriangle size={20} color="#b45309" strokeWidth={2.4} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, fontWeight: 'normal', color: '#92400e', marginBottom: 4 }}>
                Important Payment Notice
              </Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12.5, fontWeight: 'normal', color: '#78350f', lineHeight: 18 }}>
                Please ensure you have completed the payment of ₹{formattedAmount} in {launchedApp} before proceeding. Proceeding or clicking &apos;I have completed payment&apos; without completing the actual payment will result in immediate cancellation of your order.
              </Text>
            </View>
          </Animated.View>

          {/* Expandable QR Code accordion to keep screen clean and decluttered */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(150)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={() => setShowQr(!showQr)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#ecfdf5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QrCode size={18} color="#047857" strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>
                    Scan QR code instead?
                  </Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 11.5, fontWeight: 'normal', color: '#64748b' }}>
                    {showQr ? 'Tap to collapse QR' : 'Tap to show QR for another device'}
                  </Text>
                </View>
              </View>
              {showQr ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
            </Pressable>

            {showQr && (
              <View style={{ alignItems: 'center', paddingBottom: 16, paddingTop: 4, borderTopWidth: 1, borderColor: '#f1f5f9' }}>
                <View
                  style={{
                    padding: 12,
                    backgroundColor: '#ffffff',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    marginVertical: 10,
                  }}
                >
                  <QRCode value={upiUri} size={130} />
                </View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 11.5, fontWeight: 'normal', color: '#64748b' }}>
                  UPI ID: <Text style={{ color: '#047857' }}>{UPI_ID}</Text>
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* STICKY BOTTOM ACTION BAR WITH PROPER SAFE AREA INSET */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
            borderTopWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 8,
            gap: 10,
          }}
        >
          {/* Primary Action Button: "I have completed payment" -> opens confirmation modal */}
          <Pressable
            onPress={() => setConfirmModalVisible(true)}
            disabled={loading}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#047857',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Check size={20} color="#ffffff" strokeWidth={3} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15.5, fontWeight: 'normal', color: '#ffffff' }}>
              I have completed payment
            </Text>
          </Pressable>

          {/* Change method / Cancel */}
          <Pressable
            onPress={() => setScreenState('METHOD_SELECT')}
            hitSlop={8}
            style={{ alignItems: 'center', paddingVertical: 4 }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, fontWeight: 'normal', color: '#64748b' }}>
              Change payment method
            </Text>
          </Pressable>
        </View>

        {/* EDGE CASE VALIDATION & CONFIRMATION MODAL */}
        <Modal
          visible={confirmModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!loading) setConfirmModalVisible(false);
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 360,
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 22,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 18,
                elevation: 10,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: '#ecfdf5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: '#a7f3d0',
                }}
              >
                <ShieldCheck size={28} color="#047857" strokeWidth={2.4} />
              </View>

              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 18,
                  fontWeight: 'normal',
                  color: '#0f172a',
                  textAlign: 'center',
                  marginBottom: 6,
                }}
              >
                Confirm UPI Payment
              </Text>

              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13.5,
                  fontWeight: 'normal',
                  color: '#475569',
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: 14,
                }}
              >
                Did you complete the payment of <Text style={{ fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a' }}>₹{formattedAmount}</Text> in {launchedApp}?
              </Text>

              <View
                style={{
                  width: '100%',
                  backgroundColor: '#fffbeb',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#fef3c7',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                <AlertCircle size={16} color="#d97706" style={{ marginTop: 2 }} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.medium,
                    fontSize: 11.5,
                    fontWeight: 'normal',
                    color: '#92400e',
                    lineHeight: 16,
                  }}
                >
                  Please proceed only if money was debited from your bank account. Claims are cross-checked before dispatch.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', gap: 10 }}>
                <Pressable
                  onPress={submitOrderAndClaimPayment}
                  disabled={loading}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: '#047857',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    shadowColor: '#047857',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                  ) : (
                    <Check size={18} color="#ffffff" strokeWidth={2.8} style={{ marginRight: 6 }} />
                  )}
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, fontWeight: 'normal', color: '#ffffff' }}>
                    {loading ? 'Submitting payment...' : `Yes, I've paid ₹${formattedAmount}`}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setConfirmModalVisible(false)}
                  disabled={loading}
                  style={{
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, fontWeight: 'normal', color: '#475569' }}>
                    Not yet, let me pay
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 3: WAITING FOR ADMIN APPROVAL
  // =========================================================================
  if (screenState === 'WAITING_APPROVAL') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <Animated.View entering={FadeInDown.duration(350)} style={{ alignItems: 'center' }}>
            {/* Animated Pulse Circle */}
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: '#ecfdf5',
                borderWidth: 2,
                borderColor: '#a7f3d0',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Clock size={40} color="#047857" strokeWidth={2.4} />
            </View>

            <Text
              style={{
                fontSize: 22,
                fontFamily: fonts.extraBold,
                fontWeight: 'normal',
                color: '#0f172a',
                letterSpacing: -0.4,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Wait for admin approval
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontFamily: fonts.medium,
                fontWeight: 'normal',
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 22,
                maxWidth: 290,
                marginBottom: 28,
              }}
            >
              We notified the store admin of your payment of <Text style={{ fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#0f172a' }}>₹{amount}</Text>. As soon as the admin confirms receipt on the portal, your order will update here in real time!
            </Text>

            {/* Status card */}
            <View
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, fontWeight: 'normal', color: '#64748b' }}>Order Number</Text>
                <Text style={{ fontSize: 14, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#0f172a' }}>#{createdOrder?.orderNo || '10482'}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, fontWeight: 'normal', color: '#64748b' }}>Amount</Text>
                <Text style={{ fontSize: 16, fontFamily: fonts.black, fontWeight: 'normal', color: '#047857' }}>₹{amount}</Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ecfdf5',
                  borderRadius: 12,
                  padding: 10,
                  gap: 10,
                }}
              >
                <ActivityIndicator size="small" color="#047857" />
                <Text style={{ flex: 1, fontSize: 12.5, fontFamily: fonts.bold, fontWeight: 'normal', color: '#065f46' }}>
                  Awaiting store confirmation in real time...
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Footer info note */}
        <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.medium, fontWeight: 'normal', color: '#94a3b8', textAlign: 'center' }}>
            Please do not close this screen while we verify your transaction.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW 4: PAYMENT METHOD SELECTION (matching Image 2)
  // =========================================================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER: < Payment method | 4 items · To pay ₹246 matching Image 2 */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
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
          <Text style={{ fontSize: 18, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#0f172a' }}>
            {isDefaultSetupMode ? 'Default payment method' : 'Payment method'}
          </Text>
          <Text style={{ fontSize: 12.5, fontFamily: fonts.medium, fontWeight: 'normal', color: '#64748b', marginTop: 1 }}>
            {isDefaultSetupMode
              ? 'Choose your default payment method for checkout'
              : (amount ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · To pay ₹${formattedAmount}` : 'Accepted methods for checkout')}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 96, gap: 18 }}
      >
        {/* SECTION 1: UPI matching Image 2 */}
        <View>
          <Text
            style={{
              fontSize: 12,
              fontFamily: fonts.bold,
              fontWeight: 'normal',
              color: '#64748b',
              letterSpacing: 0.6,
              marginBottom: 10,
              marginLeft: 4,
            }}
          >
            UPI
          </Text>

          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            {/* Option A: Pay with any UPI app matching Image 2 */}
            <Pressable
              onPress={() => setSelectedMethod('UPI_APP')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderColor: '#f1f5f9',
              }}
            >
              {/* UPI Logo box */}
              <View
                style={{
                  width: 52,
                  height: 38,
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  paddingHorizontal: 4,
                }}
              >
                <Image
                  source={require('../../assets/upi.png')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>

              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a' }}>
                  Pay with any UPI app
                </Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.medium, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                  Opens the UPI app on your phone
                </Text>
              </View>

              {/* Radio circle matching Image 2 */}
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: selectedMethod === 'UPI_APP' ? 6.5 : 2,
                  borderColor: selectedMethod === 'UPI_APP' ? '#047857' : '#cbd5e1',
                  backgroundColor: '#ffffff',
                }}
              />
            </Pressable>

            {/* Direct UPI Apps row if UPI_APP selected */}
            {selectedMethod === 'UPI_APP' && (
              <Animated.View
                entering={FadeInDown.duration(200)}
                style={{
                  backgroundColor: '#f8fafc',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#64748b', marginBottom: 10, letterSpacing: 0.5 }}>
                  {isDefaultSetupMode ? 'TAP AN APP TO SET AS DEFAULT' : 'TAP AN APP TO PAY WITH PREFILLED AMOUNT'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {/* Google Pay */}
                  <Pressable
                    onPress={() => handleAppPress('tez://upi/pay', 'Google Pay')}
                    style={{
                      flex: 1,
                      backgroundColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Google Pay' ? '#ecfdf5' : '#ffffff',
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                      borderWidth: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Google Pay' ? 2 : 1,
                      borderColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Google Pay' ? '#047857' : '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GPayBadge />
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a', marginTop: 6 }}>
                      Google Pay
                    </Text>
                    {isDefaultSetupMode && selectedMethod === 'UPI_APP' && defaultPayment.app === 'Google Pay' && (
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={12} color="#047857" strokeWidth={3} />
                        <Text style={{ fontSize: 9.5, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857', marginLeft: 2 }}>Default</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* PhonePe */}
                  <Pressable
                    onPress={() => handleAppPress('phonepe://pay', 'PhonePe')}
                    style={{
                      flex: 1,
                      backgroundColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'PhonePe' ? '#ecfdf5' : '#ffffff',
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                      borderWidth: selectedMethod === 'UPI_APP' && defaultPayment.app === 'PhonePe' ? 2 : 1,
                      borderColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'PhonePe' ? '#047857' : '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PhonePeBadge />
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a', marginTop: 6 }}>
                      PhonePe
                    </Text>
                    {isDefaultSetupMode && selectedMethod === 'UPI_APP' && defaultPayment.app === 'PhonePe' && (
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={12} color="#047857" strokeWidth={3} />
                        <Text style={{ fontSize: 9.5, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857', marginLeft: 2 }}>Default</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Paytm */}
                  <Pressable
                    onPress={() => handleAppPress('paytmmp://pay', 'Paytm')}
                    style={{
                      flex: 1,
                      backgroundColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Paytm' ? '#ecfdf5' : '#ffffff',
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                      borderWidth: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Paytm' ? 2 : 1,
                      borderColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Paytm' ? '#047857' : '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PaytmBadge />
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a', marginTop: 6 }}>
                      Paytm
                    </Text>
                    {isDefaultSetupMode && selectedMethod === 'UPI_APP' && defaultPayment.app === 'Paytm' && (
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={12} color="#047857" strokeWidth={3} />
                        <Text style={{ fontSize: 9.5, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857', marginLeft: 2 }}>Default</Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Any Other UPI App */}
                  <Pressable
                    onPress={() => handleAppPress(null, 'Any UPI')}
                    style={{
                      flex: 1,
                      backgroundColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Any UPI' ? '#ecfdf5' : '#ffffff',
                      paddingVertical: 10,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                      borderWidth: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Any UPI' ? 2 : 1,
                      borderColor: selectedMethod === 'UPI_APP' && defaultPayment.app === 'Any UPI' ? '#047857' : '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UpiBadge />
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a', marginTop: 6 }}>
                      Any UPI
                    </Text>
                    {isDefaultSetupMode && selectedMethod === 'UPI_APP' && defaultPayment.app === 'Any UPI' && (
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={12} color="#047857" strokeWidth={3} />
                        <Text style={{ fontSize: 9.5, fontFamily: fonts.extraBold, fontWeight: 'normal', color: '#047857', marginLeft: 2 }}>Default</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {/* Option B: Pay by UPI ID matching Image 2 (Hidden during default payment setup mode) */}
            {!isDefaultSetupMode && (
              <>
                <Pressable
                  onPress={() => setSelectedMethod('UPI_ID')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                  }}
                >
                  {/* @ Icon box matching Image 2 */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Text style={{ fontSize: 20, fontFamily: fonts.bold, fontWeight: 'normal', color: '#047857' }}>@</Text>
                  </View>

                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 15, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a' }}>
                      Pay by UPI ID
                    </Text>
                    <Text style={{ fontSize: 12, fontFamily: fonts.medium, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                      Enter your UPI ID
                    </Text>
                  </View>

                  {/* Radio circle matching Image 2 */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: selectedMethod === 'UPI_ID' ? 6.5 : 2,
                      borderColor: selectedMethod === 'UPI_ID' ? '#047857' : '#cbd5e1',
                      backgroundColor: '#ffffff',
                    }}
                  />
                </Pressable>

                {/* UPI ID input + QR Code preview if selected */}
                {selectedMethod === 'UPI_ID' && (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: 16,
                      borderTopWidth: 1,
                      borderColor: '#f1f5f9',
                      gap: 12,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 12, fontFamily: fonts.bold, fontWeight: 'normal', color: '#475569', marginBottom: 6 }}>
                        ENTER UPI ID
                      </Text>
                      <TextInput
                        value={upiIdInput}
                        onChangeText={setUpiIdInput}
                        placeholder="e.g. mobileNumber@upi"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        style={{
                          backgroundColor: '#ffffff',
                          borderWidth: 1.5,
                          borderColor: '#cbd5e1',
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          height: 46,
                          fontSize: 14,
                          fontFamily: fonts.semiBold,
                          fontWeight: 'normal',
                          color: '#0f172a',
                        }}
                      />
                    </View>

                    {/* QR Code fallback */}
                    <View style={{ alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#64748b', marginBottom: 8 }}>
                        OR SCAN QR CODE TO PAY
                      </Text>
                      <View style={{ padding: 10, backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
                        <QRCode value={upiUri} size={140} />
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: fonts.bold, fontWeight: 'normal', color: '#047857', marginTop: 8 }}>
                        UPI ID: {UPI_ID}
                      </Text>
                    </View>

                    {/* I have completed payment button */}
                    <Pressable
                      onPress={submitOrderAndClaimPayment}
                      disabled={loading}
                      style={{
                        backgroundColor: '#047857',
                        borderRadius: 12,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontFamily: fonts.bold, fontWeight: 'normal', color: '#ffffff' }}>
                        {loading ? 'Submitting...' : 'I have completed the payment'}
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </>
            )}
          </View>
        </View>

        {/* SECTION 2: CARDS & NET BANKING (Coming Soon) matching Image 2 */}
        <View>
          <Text
            style={{
              fontSize: 12,
              fontFamily: fonts.bold,
              fontWeight: 'normal',
              color: '#64748b',
              letterSpacing: 0.6,
              marginBottom: 10,
              marginLeft: 4,
            }}
          >
            CARDS & NET BANKING
          </Text>

          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            {/* Credit or debit card */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderColor: '#f1f5f9',
                opacity: 0.7,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#f8fafc',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <CreditCard size={22} color="#64748b" strokeWidth={2} />
              </View>

              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a' }}>
                  Credit or debit card
                </Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.medium, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                  Visa, Mastercard, RuPay
                </Text>
              </View>

              {/* Coming soon badge + radio circle matching Image 2 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#64748b' }}>
                    Coming soon
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: '#cbd5e1',
                    backgroundColor: '#ffffff',
                  }}
                />
              </View>
            </View>

            {/* Net banking */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                opacity: 0.7,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: '#f8fafc',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Building2 size={22} color="#64748b" strokeWidth={2} />
              </View>

              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontFamily: fonts.bold, fontWeight: 'normal', color: '#0f172a' }}>
                  Net banking
                </Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.medium, fontWeight: 'normal', color: '#64748b', marginTop: 2 }}>
                  All major banks
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: '#64748b' }}>
                    Coming soon
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: '#cbd5e1',
                    backgroundColor: '#ffffff',
                  }}
                />
              </View>
            </View>
          </View>
        </View>



        {/* Security footnote matching Image 2 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
          <Lock size={14} color="#94a3b8" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, fontFamily: fonts.medium, fontWeight: 'normal', color: '#94a3b8' }}>
            Payments are encrypted and secure
          </Text>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BUTTON matching Image 2 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 16) + 12,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        {isDefaultSetupMode ? (
          <Pressable
            onPress={handleSaveDefaultMethod}
            style={{
              height: 52,
              borderRadius: 16,
              backgroundColor: '#047857',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
              gap: 8,
            }}
          >
            <Check size={20} color="#ffffff" strokeWidth={3} />
            <Text style={{ fontSize: 16, fontFamily: fonts.bold, fontWeight: 'normal', color: '#ffffff' }}>
              Set {defaultPayment.app || 'UPI'} as default
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handlePayNow}
            disabled={loading}
            style={{
              height: 54,
              borderRadius: 16,
              backgroundColor: '#047857',
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View>
              <Text style={{ fontSize: 11, fontFamily: fonts.bold, fontWeight: 'normal', color: 'rgba(255, 255, 255, 0.85)' }}>
                {selectedMethod === 'UPI_APP' ? `Pay with ${defaultPayment.app || 'UPI app'}` : 'Pay by UPI ID'}
              </Text>
              <Text style={{ fontSize: 17, fontFamily: fonts.black, fontWeight: 'normal', color: '#ffffff' }}>
                ₹{formattedAmount}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 15.5, fontFamily: fonts.bold, fontWeight: 'normal', color: '#ffffff', marginRight: 4 }}>
                {loading ? 'Processing...' : 'Pay now'}
              </Text>
              <ArrowRight size={18} color="#ffffff" strokeWidth={2.8} />
            </View>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
