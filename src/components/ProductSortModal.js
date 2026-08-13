import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { SORT_OPTIONS } from '../utils/productFilters';

export default function ProductSortModal({ visible, onClose, onApply, initialSort }) {
  const insets = useSafeAreaInsets();
  const [sortKey, setSortKey] = useState(initialSort || 'popularity');

  useEffect(() => {
    if (visible) setSortKey(initialSort || 'popularity');
  }, [visible, initialSort]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-border-light">
          <Pressable onPress={onClose} className="flex-row items-center">
            <ChevronLeft size={22} color="#0f172a" />
            <Text className="text-lg font-black text-text-primary ml-1">Sort by</Text>
          </Pressable>
          <Pressable onPress={() => setSortKey('popularity')}>
            <Text className="text-sm font-bold text-primary-600">Clear All</Text>
          </Pressable>
        </View>

        <View className="flex-1 px-4">
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setSortKey(opt.key)}
              className="flex-row items-center py-4 border-b border-border-light"
            >
              <View
                style={{
                  width: 22, height: 22, borderRadius: 5, borderWidth: 1.5,
                  borderColor: sortKey === opt.key ? '#16a34a' : '#cbd5e1',
                  backgroundColor: sortKey === opt.key ? '#16a34a' : '#fff',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {sortKey === opt.key && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
              <Text className="ml-3 text-sm font-semibold text-text-primary">{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Pressable
            onPress={() => { onApply(sortKey); onClose(); }}
            className="bg-primary-600 mx-4 mb-2 mt-3 py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-black text-sm tracking-wide">APPLY SORT</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
