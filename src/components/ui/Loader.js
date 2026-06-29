import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Loader({ text, fullScreen = true }) {
  const content = (
    <View className="items-center justify-center p-4">
      <ActivityIndicator size="large" color="#16a34a" />
      {text && <Text className="mt-4 text-sm font-medium text-text-secondary">{text}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-50">
        {content}
      </View>
    );
  }

  return content;
}
