import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShoppingCart } from 'lucide-react-native';

// Floating "View Cart" bar shared by every product-listing screen (Home, Category,
// ProductList). It anchors above the device's bottom safe-area inset instead of a
// hardcoded `bottom: 20` — with app.json's edgeToEdgeEnabled:true the app draws under
// the system navigation bar, so a fixed 20px offset put the bar (and its text) behind
// the nav buttons, which is the clipping/overlap seen on gesture-nav phones.
//
// Screens that render this must add BOTTOM_SPACER to their list/scroll contentContainer
// paddingBottom so the last row can scroll clear of the bar.
export const CART_BAR_SPACER = 96;

export default function CartBar({ items, onPress }) {
  const insets = useSafeAreaInsets();
  if (!items || items.length === 0) return null;

  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0);

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: insets.bottom + 12,
        left: 16,
        right: 16,
        backgroundColor: '#16a34a',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }} numberOfLines={1}>
          {count} Item{count > 1 ? 's' : ''}
        </Text>
        <View style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 10 }} />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
          ₹{total}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          marginLeft: 12,
        }}
      >
        <ShoppingCart size={15} color="#16a34a" strokeWidth={2.5} />
        <Text style={{ color: '#16a34a', fontSize: 14, fontWeight: '800', marginLeft: 6 }}>View Cart</Text>
      </Pressable>
    </Animated.View>
  );
}
