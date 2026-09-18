import React from 'react';
import { View, Text } from 'react-native';
import { Truck, PartyPopper } from 'lucide-react-native';
import { FREE_DELIVERY_THRESHOLD } from '../../utils/pricing';

// Blinkit/Instamart-style nudge shown on Cart + Checkout: either "you've unlocked free
// delivery" once the cart clears FREE_DELIVERY_THRESHOLD, or how much more to add.
export default function FreeDeliveryBanner({ subtotal, style }) {
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
  const unlocked = remaining <= 0;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: unlocked ? '#f0fdf4' : '#fffbeb',
          borderWidth: 1,
          borderColor: unlocked ? '#bbf7d0' : '#fde68a',
        },
        style,
      ]}
    >
      {unlocked ? (
        <PartyPopper size={16} color="#16a34a" />
      ) : (
        <Truck size={16} color="#d97706" />
      )}
      <Text
        style={{
          marginLeft: 8,
          fontSize: 12.5,
          fontWeight: '700',
          color: unlocked ? '#15803d' : '#b45309',
          flex: 1,
        }}
      >
        {unlocked
          ? "You've unlocked FREE delivery on this order!"
          : `Add ₹${remaining.toFixed(0)} more to get FREE delivery`}
      </Text>
    </View>
  );
}
