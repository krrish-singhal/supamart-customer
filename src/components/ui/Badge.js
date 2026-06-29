import React from 'react';
import { View, Text } from 'react-native';

export default function Badge({ count, className = '' }) {
  if (!count || count <= 0) return null;
  
  return (
    <View className={`absolute -top-2 -right-2 bg-red-500 border-2 border-white rounded-full min-w-[20px] h-5 items-center justify-center px-1 z-10 ${className}`}>
      <Text className="text-[10px] font-bold text-white">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}
