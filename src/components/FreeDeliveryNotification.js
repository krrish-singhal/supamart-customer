import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Truck, X } from './icons';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { FREE_DELIVERY_THRESHOLD } from '../utils/pricing';
import { postSystemNotification } from '../services/notifications';

export default function FreeDeliveryNotification({ active = false }) {
  const { subtotal, itemCount } = useCart();
  const { config } = useConfig();
  const { top } = useSafeAreaInsets();
  const unlocked = Boolean(config && itemCount > 0 && subtotal >= (config.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD));
  const previous = useRef(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    if (unlocked && !previous.current) {
      setVisible(true);
      postSystemNotification({
        title: 'Yay! Free delivery unlocked',
        body: 'No delivery fee on this order — keep shopping or proceed to checkout.',
        data: { type: 'FREE_DELIVERY' },
      });
    }
    if (!unlocked) setVisible(false);
    previous.current = unlocked;
  }, [active, unlocked]);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [visible]);
  if (!active || !visible) return null;
  return <Animated.View entering={SlideInUp.duration(280)} exiting={SlideOutUp.duration(220)} accessibilityRole="alert" style={{ position: 'absolute', top: top + 8, left: 12, right: 12, zIndex: 10000, elevation: 30, backgroundColor: '#008958', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12 }}>
    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 10 }}><Truck size={22} color="#008958" /></View>
    <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14 }}>Yay! Free delivery unlocked</Text><Text style={{ color: '#dcfce7', fontSize: 12, marginTop: 3 }}>No delivery fee on this order</Text></View>
    <Pressable accessibilityLabel="Dismiss free delivery notification" hitSlop={12} onPress={() => setVisible(false)}><X color="#fff" size={20} /></Pressable>
  </Animated.View>;
}
