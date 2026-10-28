import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, X, ArrowRight } from './icons';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../context/NotificationsContext';
import { navigationRef } from '../navigation/navigationRef';

export default function DeliveryDelayNotification() {
  const { activeDelayAlert, dismissDelayAlert } = useNotifications();
  const { top } = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activeDelayAlert) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        dismissDelayAlert();
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [activeDelayAlert, dismissDelayAlert]);

  if (!visible || !activeDelayAlert) return null;

  const handlePress = () => {
    setVisible(false);
    dismissDelayAlert();
    if (activeDelayAlert.data?.orderId && navigationRef?.isReady?.()) {
      try {
        navigationRef.navigate('OrderTracking', {
          orderId: activeDelayAlert.data.orderId,
          orderNo: activeDelayAlert.data.orderNo,
        });
      } catch (_e) {}
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    dismissDelayAlert();
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
        zIndex: 10001,
        elevation: 35,
        backgroundColor: '#b45309',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1,
        borderColor: '#fde68a',
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
      >
        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 10 }}>
          <Clock size={22} color="#b45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14 }}
            numberOfLines={1}
          >
            {activeDelayAlert.title || 'Delivery Update'}
          </Text>
          <Text
            style={{ color: '#fef3c7', fontSize: 12, marginTop: 2 }}
            numberOfLines={2}
          >
            {activeDelayAlert.body || 'Your delivery time has been updated.'}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Text style={{ color: '#92400e', fontSize: 11.5, fontWeight: '800' }}>Track</Text>
          <ArrowRight size={13} color="#92400e" />
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Dismiss delay notification"
        hitSlop={12}
        onPress={handleDismiss}
        style={{ padding: 4 }}
      >
        <X color="#fff" size={20} />
      </Pressable>
    </Animated.View>
  );
}
