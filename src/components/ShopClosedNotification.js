import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, AppState } from 'react-native';
import { Clock, X } from './icons';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useStoreStatus from '../hooks/useStoreStatus';
import { postSystemNotification } from '../services/notifications';
import { fonts } from '../theme/typography';

/**
 * Format time string (e.g. '10:00' -> '10:00 AM', '23:00' -> '11:00 PM')
 */
function formatTime12(timeStr) {
  if (!timeStr) return '10:00 AM';
  const str = String(timeStr).trim();
  if (/am|pm/i.test(str)) return str;
  const parts = str.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const mStr = String(m).padStart(2, '0');
      return `${h12}:${mStr} ${period}`;
    }
  }
  return '10:00 AM';
}

export default function ShopClosedNotification() {
  const storeStatus = useStoreStatus();
  const isOpen = Boolean(storeStatus?.isOpen);
  const opensAt = storeStatus?.opensAt || '10:00';
  const { top } = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const notifiedClosedRef = useRef(false);
  const lastClosedShownAtRef = useRef(0);

  const formattedOpeningTime = useMemo(() => formatTime12(opensAt), [opensAt]);

  useEffect(() => {
    // When store is open, clear notification & reset flags
    if (isOpen) {
      notifiedClosedRef.current = false;
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // When store is closed: trigger notification if not already shown in this closed window
    const now = Date.now();
    const shouldNotify = !notifiedClosedRef.current || (now - lastClosedShownAtRef.current > 15 * 60 * 1000);

    if (!isOpen && shouldNotify) {
      notifiedClosedRef.current = true;
      lastClosedShownAtRef.current = now;
      setVisible(true);

      // Post OS-level system notification in status bar / drawer (similar to FreeDeliveryNotification)
      postSystemNotification({
        title: 'Shop is closed Now !',
        body: `Come back again at ${formattedOpeningTime}`,
        data: { type: 'SHOP_CLOSED' },
      }).catch(() => {});

      // Auto-hide popup after 6.5 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 6500);
    }
  }, [isOpen, formattedOpeningTime]);

  // Handle app coming to foreground: remind user if shop is closed and last notification was > 15m ago
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !isOpen) {
        const now = Date.now();
        if (now - lastClosedShownAtRef.current > 15 * 60 * 1000) {
          lastClosedShownAtRef.current = now;
          setVisible(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setVisible(false);
          }, 6500);
        }
      }
    });

    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  if (!visible) return null;

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
      accessibilityLabel={`Shop is closed Now ! Come back again at ${formattedOpeningTime}`}
      style={{
        position: 'absolute',
        top: top + 8,
        left: 12,
        right: 12,
        zIndex: 10006,
        elevation: 42,
        backgroundColor: '#1E293B',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        borderWidth: 1.5,
        borderColor: '#F59E0B',
      }}
    >
      <Pressable
        onPress={handleDismiss}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
      >
        <View
          style={{
            backgroundColor: '#F59E0B',
            borderRadius: 24,
            padding: 9,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={20} color="#1E293B" strokeWidth={2.5} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                color: '#FFFFFF',
                fontFamily: fonts.bold,
                fontSize: 14.5,
                letterSpacing: 0.2,
              }}
              numberOfLines={1}
            >
              Shop is closed Now !
            </Text>
            <View
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.22)',
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.4)',
              }}
            >
              <Text
                style={{
                  color: '#FCD34D',
                  fontFamily: fonts.semiBold,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Closed
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: '#CBD5E1',
              fontFamily: fonts.medium,
              fontSize: 12.5,
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            Come back again at {formattedOpeningTime}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityLabel="Dismiss shop closed notification"
        hitSlop={12}
        onPress={handleDismiss}
        style={{ padding: 6, marginLeft: 2 }}
      >
        <X color="#94A3B8" size={19} />
      </Pressable>
    </Animated.View>
  );
}
