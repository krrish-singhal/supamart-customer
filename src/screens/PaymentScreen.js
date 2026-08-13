import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar, Linking, AppState } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, AlertCircle, ShieldAlert } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { Header, Card, Button } from '../components/ui';
import { GPayBadge, PhonePeBadge, PaytmBadge } from '../components/ui/PaymentAppBadge';
import { UPI_ID, UPI_PAYEE_NAME } from '../config/global';
import { useCart } from '../context/CartContext';

function buildUpiParams(amount, note) {
  return `pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
}

// The only two ways to pay, per spec: scan the merchant QR, or redirect to Google Pay.
// Neither path can report a verified transaction status back to the app (Linking.openURL
// is fire-and-forget, and a real PSP webhook would need a payment-gateway subscription
// this project doesn't have) — so both rely on the customer explicitly confirming after
// attempting payment, same "claim now, admin verifies" trust model the backend already
// enforces (PENDING -> AWAITING_CONFIRMATION -> PAID, admin-only for the final step).
export default function PaymentScreen({ route, navigation }) {
  const { payload, idempotencyKey, amount } = route.params;
  const insets = useSafeAreaInsets();
  const { loadCart } = useCart();
  const [confirming, setConfirming] = useState(false);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const appState = useRef(AppState.currentState);

  // UX-only: when the app resumes after a Google Pay redirect attempt, surface the
  // confirmation prompt. This never triggers order creation itself — only the explicit
  // "I've completed the payment" tap below does that.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active' && awaitingReturn) {
        setShowReturnPrompt(true);
        setAwaitingReturn(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [awaitingReturn]);

  const note = `MS Traders order`;
  const upiParams = buildUpiParams(amount, note);
  const upiUri = `upi://pay?${upiParams}`;

  // Tries the app's own URI scheme first (deep-links straight into that app with the
  // amount pre-filled), falls back to the generic upi:// intent (lets the OS offer any
  // installed UPI app) if the specific app isn't installed.
  const payWithApp = async (scheme, appLabel) => {
    setAwaitingReturn(true);
    try {
      await Linking.openURL(`${scheme}?${upiParams}`);
    } catch {
      try {
        await Linking.openURL(upiUri);
      } catch {
        setAwaitingReturn(false);
        Toast.show({ type: 'error', text1: `${appLabel} isn't installed`, text2: 'Scan the QR code instead.' });
      }
    }
  };

  const payWithGooglePay = () => payWithApp('tez://upi/pay', 'Google Pay');
  const payWithPhonePe = () => payWithApp('phonepe://pay', 'PhonePe');
  const payWithPaytm = () => payWithApp('paytmmp://pay', 'Paytm');

  const handleConfirmPayment = async () => {
    setConfirming(true);
    try {
      const { data } = await apiClient.post('/orders', payload, {
        headers: { 'X-Idempotency-Key': idempotencyKey },
      });
      await apiClient.patch(`/orders/${data.id}/payment-claimed`);
      // The backend already cleared the cart when the order was created — resync
      // CartContext's in-memory state now, so navigating back doesn't show the
      // just-ordered items as if they were still sitting in an active cart.
      await loadCart(true, { force: true });
      Toast.show({ type: 'success', text1: 'Payment noted!', text2: "We'll confirm it shortly." });
      navigation.replace('OrderTracking', { orderId: data.id, orderNo: data.orderNo });
    } catch {
      // interceptor already shows the error toast; nothing was created, cart is untouched.
      setShowReturnPrompt(false);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Complete Payment" onBack={() => navigation.goBack()} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(350)}>
          <Card className="items-center mb-5" elevation="sm">
            <Text className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-1">Amount to Pay</Text>
            <Text className="text-4xl font-black text-text-primary">₹{Number(amount).toFixed(2)}</Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(350).delay(60)}>
          <Card className="items-center mb-5" elevation="sm">
            <View className="flex-row items-center mb-3">
              <QrCode size={18} color="#64748b" />
              <Text className="text-sm font-bold text-text-primary ml-2">Scan QR to Pay</Text>
            </View>
            <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 12 }}>
              <QRCode value={upiUri} size={190} />
            </View>
            <Text className="text-xs font-medium text-text-tertiary mt-3 text-center">
              Scan with any UPI app — the amount (₹{Number(amount).toFixed(2)}) is filled in automatically for {UPI_PAYEE_NAME || 'MS Traders'}.
            </Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(350).delay(120)}>
          <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Or pay using</Text>

          <Pressable
            onPress={payWithGooglePay}
            className="flex-row items-center bg-white border border-border-light rounded-2xl p-4 shadow-soft mb-2"
          >
            <View style={{ marginRight: 12 }}><GPayBadge /></View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary">Pay with Google Pay</Text>
              <Text className="text-xs font-medium text-text-tertiary mt-0.5">Opens Google Pay with the amount filled in</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={payWithPhonePe}
            className="flex-row items-center bg-white border border-border-light rounded-2xl p-4 shadow-soft mb-2"
          >
            <View style={{ marginRight: 12 }}><PhonePeBadge /></View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary">Pay with PhonePe</Text>
              <Text className="text-xs font-medium text-text-tertiary mt-0.5">Opens PhonePe with the amount filled in</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={payWithPaytm}
            className="flex-row items-center bg-white border border-border-light rounded-2xl p-4 shadow-soft mb-2"
          >
            <View style={{ marginRight: 12 }}><PaytmBadge /></View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-text-primary">Pay with Paytm</Text>
              <Text className="text-xs font-medium text-text-tertiary mt-0.5">Opens Paytm with the amount filled in</Text>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(350).delay(180)}>
          <View className="flex-row items-start bg-red-50 border border-red-100 rounded-2xl p-4 mt-1">
            <ShieldAlert size={18} color="#dc2626" style={{ marginTop: 1 }} />
            <Text className="text-xs font-semibold text-red-700 ml-2 flex-1 leading-5">
              Tapping &quot;I&apos;ve completed the payment&quot; without actually paying will result in your order being cancelled.
            </Text>
          </View>
        </Animated.View>

        {showReturnPrompt && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <View className="flex-row items-start bg-amber-50 border border-amber-100 rounded-2xl p-4 mt-3">
              <AlertCircle size={18} color="#d97706" style={{ marginTop: 1 }} />
              <Text className="text-xs font-semibold text-amber-800 ml-2 flex-1 leading-5">
                Did your payment go through? Tap &quot;I&apos;ve completed the payment&quot; below to confirm.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View
        entering={FadeInDown.duration(350).delay(240)}
        className="px-4 pt-3 bg-white border-t border-border-light"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button
          title="I've completed the payment"
          onPress={handleConfirmPayment}
          loading={confirming}
          disabled={confirming}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
