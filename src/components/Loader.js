import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Loader({ size = 'large', color = '#121212' }) {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50">
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}
