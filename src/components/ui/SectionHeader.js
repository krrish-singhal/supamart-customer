import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export default function SectionHeader({ title, subtitle, actionText, onAction, className = '' }) {
  return (
    <View className={`flex-row items-end justify-between mb-4 ${className}`}>
      <View>
        <Text className="text-xl font-bold text-text-primary">{title}</Text>
        {subtitle && <Text className="text-sm text-text-secondary mt-0.5">{subtitle}</Text>}
      </View>
      {actionText && (
        <Pressable onPress={onAction} className="flex-row items-center active:opacity-70 pb-1">
          <Text className="text-sm font-bold text-primary-600 mr-0.5">{actionText}</Text>
          <ChevronRight size={16} color="#16a34a" />
        </Pressable>
      )}
    </View>
  );
}
