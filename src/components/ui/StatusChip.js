import React from 'react';
import { View, Text } from 'react-native';

export default function StatusChip({ status, label }) {
  const config = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700' },
    ready: { bg: 'bg-purple-100', text: 'text-purple-700' },
    out_for_delivery: { bg: 'bg-orange-100', text: 'text-orange-700' },
    delivered: { bg: 'bg-green-100', text: 'text-green-700' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  };

  const style = config[status?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <View className={`px-3 py-1 rounded-full ${style.bg} self-start`}>
      <Text className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
        {label || status}
      </Text>
    </View>
  );
}
