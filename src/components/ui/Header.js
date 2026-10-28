import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft } from '../icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function Header({ title, subtitle, showBack = true, onBack, rightComponent, transparent = false }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation?.navigate('Main', { screen: 'Home' });
    }
  };

  return (
    <View
      className={`flex-row items-center justify-between px-4 pb-3 ${transparent ? 'bg-transparent' : 'bg-white border-b border-border-light'}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="w-12 items-start justify-center">
        {showBack && (
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-surface-50 items-center justify-center border border-border-light active:bg-surface-100 transition-colors"
          >
            <ChevronLeft size={24} color="#0f172a" />
          </Pressable>
        )}
      </View>

      <View className="flex-1 items-center justify-center px-2">
        {title && (
          <Text className="text-[22px] leading-[28px] font-extrabold text-text-primary text-center" numberOfLines={1}>
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
