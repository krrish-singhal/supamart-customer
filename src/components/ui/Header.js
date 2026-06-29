import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ title, subtitle, showBack = true, onBack, rightComponent, transparent = false }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-row items-center justify-between px-4 pb-3 ${transparent ? 'bg-transparent' : 'bg-white border-b border-border-light'}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="w-12 items-start justify-center">
        {showBack && onBack && (
          <Pressable
            onPress={onBack}
            className="w-10 h-10 rounded-full bg-surface-50 items-center justify-center border border-border-light active:bg-surface-100 transition-colors"
          >
            <ChevronLeft size={24} color="#0f172a" />
          </Pressable>
        )}
      </View>

      <View className="flex-1 items-center justify-center px-2">
        {title && (
          <Text className="text-[18px] leading-[26px] font-bold text-text-primary text-center" numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text className="text-[12px] leading-[16px] font-medium text-text-tertiary text-center mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View className="w-12 items-end justify-center">
        {rightComponent}
      </View>
    </View>
  );
}
