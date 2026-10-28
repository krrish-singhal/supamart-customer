import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Truck, X, ChevronRight } from './icons';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { FREE_DELIVERY_THRESHOLD } from '../utils/pricing';
import { postSystemNotification } from '../services/notifications';
import { navigationRef } from '../navigation/navigationRef';
import { fonts } from '../theme/typography';

export default function FreeDeliveryNotification() {
  const { subtotal, itemCount } = useCart();
  const { config } = useConfig();
  const { top } = useSafeAreaInsets();
  const threshold = Number(config?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD);
  const isUnlocked = Boolean(itemCount > 0 && subtotal >= threshold);

  const prevUnlockedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Whenever cart is below threshold or emptied (e.g. order placed or items removed),
    // always reset the unlocked ref so the next time it reaches threshold, it triggers again!
    if (!isUnlocked) {
      prevUnlockedRef.current = false;
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Every time cart reaches or crosses the free delivery threshold
    if (isUnlocked && !prevUnlockedRef.current) {
      prevUnlockedRef.current = true;
      setVisible(true);

      // Post OS-level system notification in status bar / drawer
      postSystemNotification({
        title: 'Yay! Free delivery unlocked',
        body: `Your cart is ₹${Math.round(subtotal)}! You've unlocked FREE delivery on this order.`,
        data: { type: 'FREE_DELIVERY' },
      }).catch(() => {});

      // Auto-hide popup after 5 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 5000);
    }
  }, [isUnlocked, subtotal]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  const handlePress = () => {
    setVisible(false);
    if (navigationRef?.isReady?.()) {
      try {
        navigationRef.navigate('Main', { screen: 'Cart' });
      } catch (_e) {}
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <Animated.View
      entering={SlideInUp.duration(280)}
      exiting={SlideOutUp.duration(220)}
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: top + 8,
        left: 12,
        right: 12,
        zIndex: 10005,
        elevation: 40,
        backgroundColor: '#047857',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1.5,
        borderColor: '#059669',
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 10 }}>
          <Truck size={22} color="#047857" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: '#ffffff', fontFamily: fonts.bold, fontSize: 14.5 }}
            numberOfLines={1}
          >
            Yay! Free delivery unlocked
          </Text>
          <Text
            style={{ color: '#dcfce7', fontFamily: fonts.medium, fontSize: 12, marginTop: 2 }}
            numberOfLines={1}
          >
            No delivery fee on this order · Tap to view cart
          </Text>
        </View>
        <ChevronRight size={18} color="#dcfce7" strokeWidth={2.4} />
      </Pressable>
      <Pressable
        accessibilityLabel="Dismiss free delivery notification"
        hitSlop={12}
        onPress={handleDismiss}
        style={{ padding: 4, marginLeft: 2 }}
      >
        <X color="#ffffff" size={18} />
      </Pressable>
    </Animated.View>
  );
}
