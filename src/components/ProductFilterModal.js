import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { PRICE_RANGES, DISCOUNT_RANGES, EMPTY_FILTERS } from '../utils/productFilters';

const TABS = ['Brands', 'Categories', 'Price', 'Discount'];

function Checkbox({ checked }) {
  return (
    <View
      style={{
        width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
        borderColor: checked ? '#16a34a' : '#cbd5e1',
        backgroundColor: checked ? '#16a34a' : '#fff',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {checked && <Check size={13} color="#fff" strokeWidth={3} />}
    </View>
  );
}

export default function ProductFilterModal({ visible, onClose, onApply, contextLabel, brands = [], categories = [], initialFilters }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('Brands');
  const [filters, setFilters] = useState(initialFilters || EMPTY_FILTERS);

  useEffect(() => {
    if (visible) setFilters(initialFilters || EMPTY_FILTERS);
  }, [visible, initialFilters]);

  const toggle = (listKey, value) => {
    setFilters((prev) => {
      const list = prev[listKey] || [];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [listKey]: next };
    });
  };

  const renderOptions = () => {
    if (tab === 'Brands') {
      return brands.map((b) => (
        <Pressable key={b.id} onPress={() => toggle('brandIds', b.id)} className="flex-row items-center py-3">
          <Checkbox checked={filters.brandIds.includes(b.id)} />
          <Text className="ml-3 text-sm font-medium text-text-primary">{b.name}</Text>
        </Pressable>
      ));
    }
    if (tab === 'Categories') {
      return categories.map((c) => (
        <Pressable key={c.id} onPress={() => toggle('categoryIds', c.id)} className="flex-row items-center py-3">
          <Checkbox checked={filters.categoryIds.includes(c.id)} />
          <Text className="ml-3 text-sm font-medium text-text-primary">{c.name}</Text>
        </Pressable>
      ));
    }
    if (tab === 'Price') {
      return PRICE_RANGES.map((r) => (
        <Pressable key={r.key} onPress={() => toggle('priceKeys', r.key)} className="flex-row items-center py-3">
          <Checkbox checked={filters.priceKeys.includes(r.key)} />
          <Text className="ml-3 text-sm font-medium text-text-primary">{r.label}</Text>
        </Pressable>
      ));
    }
    return DISCOUNT_RANGES.map((r) => (
      <Pressable key={r.key} onPress={() => toggle('discountKeys', r.key)} className="flex-row items-center py-3">
        <Checkbox checked={filters.discountKeys.includes(r.key)} />
        <Text className="ml-3 text-sm font-medium text-text-primary">{r.label}</Text>
      </Pressable>
    ));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Pressable onPress={onClose} className="flex-row items-center">
            <ChevronLeft size={22} color="#0f172a" />
            <Text className="text-lg font-black text-text-primary ml-1">Filters</Text>
          </Pressable>
          <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
            <Text className="text-sm font-bold text-primary-600">Clear All Filters</Text>
          </Pressable>
        </View>

        {!!contextLabel && (
          <View className="px-4 pb-2">
            <View className="self-start bg-surface-100 rounded-full px-3 py-1.5">
              <Text className="text-xs font-bold text-text-primary">{contextLabel}</Text>
            </View>
          </View>
        )}

        <View className="flex-1 flex-row border-t border-border-light">
          <View style={{ width: 110 }} className="border-r border-border-light">
            {TABS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`px-3 py-4 border-b border-border-light ${tab === t ? 'bg-primary-50' : 'bg-white'}`}
              >
                <Text className={`text-sm ${tab === t ? 'font-black text-primary-700' : 'font-medium text-text-secondary'}`}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {renderOptions()}
          </ScrollView>
        </View>

        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Pressable
            onPress={() => { onApply(filters); onClose(); }}
            className="bg-primary-600 mx-4 mb-2 mt-3 py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-black text-sm tracking-wide">APPLY FILTER</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
