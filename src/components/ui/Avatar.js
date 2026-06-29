import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 rounded-full',
    md: 'w-12 h-12 rounded-full',
    lg: 'w-16 h-16 rounded-full',
    xl: 'w-24 h-24 rounded-full',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const initial = name ? name.charAt(0).toUpperCase() : '';

  return (
    <View className={`bg-primary-100 items-center justify-center overflow-hidden ${sizes[size]} ${className}`}>
      {src ? (
        <Image source={{ uri: src }} className="w-full h-full" contentFit="cover" />
      ) : initial ? (
        <Text className={`font-bold text-primary-700 ${textSizes[size]}`}>{initial}</Text>
      ) : (
        <User size={size === 'sm' ? 16 : size === 'xl' ? 40 : 24} color="#16a34a" />
      )}
    </View>
  );
}
