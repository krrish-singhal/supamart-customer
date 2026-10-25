import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { ChevronRight, ShoppingBag } from '../icons';
import { getProductImageSource } from '../../utils/productImages';

export const CART_BAR_SPACER = 84;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CartBar({ items, onPress, variant = 'default' }) {
  const insets = useSafeAreaInsets();
  const bounceScale = useSharedValue(1);

  const count = items ? items.reduce((sum, item) => sum + (item.qty || 1), 0) : 0;
  const total = items ? items.reduce((sum, item) => sum + (item.price ?? 0) * (item.qty || 1), 0) : 0;

  useEffect(() => {
    if (count > 0) {
      bounceScale.value = withSequence(
        withTiming(1.04, { duration: 120 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
    }
  }, [count, total, bounceScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  if (!items || items.length === 0 || count === 0) return null;

  const firstItem = items[0];
  const itemImg = firstItem ? getProductImageSource(firstItem, 120) : null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(180)}
      exiting={FadeOutDown.duration(200)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: Math.max(insets.bottom, 14) + 10,
        left: 12,
        right: 12,
        zIndex: 99,
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        style={[
          animatedStyle,
          {
            backgroundColor: '#047857',
            borderRadius: 16,
            minHeight: 56,
            paddingVertical: 8,
            flexWrap: 'wrap',
            gap: 8,
            paddingLeft: 18,
            paddingRight: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
          },
        ]}
      >
        {/* Left: count and total matching Image 3 & 4 */}
        <View style={{ justifyContent: 'center' }}>
          <Text
            style={{
              fontFamily: 'Inter-Medium',
              fontSize: 11.5,
              fontWeight: 'normal',
              color: '#ffffff',
              opacity: 0.92,
            }}
          >
            {count} item(s) added
          </Text>
          <Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 17,
              fontWeight: 'normal',
              color: '#ffffff',
              marginTop: 1,
            }}
          >
            ₹{total.toFixed(0)}
          </Text>
        </View>

        {/* Right: View cart pill button matching Image 3 & 4 */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter-Bold',
              fontSize: 13,
              fontWeight: 'normal',
              color: '#ffffff',
              marginRight: 4,
            }}
          >
            View cart
          </Text>
          <ChevronRight size={15} color="#ffffff" strokeWidth={2.8} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
