import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Package, Wifi, Search, ShoppingCart, AlertCircle, Bell, Truck, Box } from 'lucide-react-native';

const ICONS = {
  empty:  Package,
  box:    Box,
  offline: Wifi,
  search: Search,
  cart:   ShoppingCart,
  error:  AlertCircle,
  bell:   Bell,
  truck:  Truck,
};

export default function EmptyState({ icon = 'empty', message = 'Nothing here yet', onRetry }) {
  const Icon = ICONS[icon] || Package;
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50 px-8">
      <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
        <Icon size={36} color="#555555" strokeWidth={1.5} />
      </View>
      <Text className="text-base font-semibold text-primary-900 text-center">{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="mt-6 px-6 py-3 bg-primary-900 rounded-xl"
        >
          <Text className="text-white font-semibold text-sm">Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}
