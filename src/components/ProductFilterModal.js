import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from './icons';

const SORT_OPTIONS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'discount', label: 'Discount' },
  { key: 'newest', label: 'Newest' },
];

const PRICE_OPTIONS = [
  { key: 'under_100', label: 'Under ₹100' },
  { key: '100_300', label: '₹100 to ₹300' },
  { key: '300_500', label: '₹300 to ₹500' },
  { key: 'above_500', label: 'Above ₹500' },
];

const PACK_SIZE_OPTIONS = [
  { key: '250g', label: '250 g' },
  { key: '500g', label: '500 g' },
  { key: '1kg', label: '1 kg' },
  { key: '2kg', label: '2 kg' },
  { key: '5kg', label: '5 kg' },
  { key: '10kg', label: '10 kg' },
];

const DISCOUNT_OPTIONS = [
  { key: '10plus', label: '10% or more' },
  { key: '20plus', label: '20% or more' },
  { key: '30plus', label: '30% or more' },
  { key: '40plus', label: '40% or more' },
];

export default function ProductFilterModal({
  visible,
  onClose,
  onApply,
  initialSort = 'relevance',
  initialFilters = {},
  categories = [],
  brands = [],
  contextLabel,
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('sort');
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [selectedPrices, setSelectedPrices] = useState(initialFilters.prices || []);
  const [selectedPackSizes, setSelectedPackSizes] = useState(initialFilters.packSizes || []);
  const [selectedDiscounts, setSelectedDiscounts] = useState(initialFilters.discounts || []);
  const [selectedTypes, setSelectedTypes] = useState(
    initialFilters.categoryIds || initialFilters.types || []
  );

  const availableTabs = React.useMemo(() => {
    const tabs = [
      { key: 'sort', label: 'Sort by' },
      { key: 'price', label: 'Price' },
      { key: 'packSize', label: 'Pack size' },
      { key: 'discount', label: 'Discount' },
    ];
    if (categories && categories.length > 0) {
      tabs.push({ key: 'type', label: 'Category' });
    }
    return tabs;
  }, [categories]);

  const categoryOptions = React.useMemo(() => {
    return (categories || []).map((c) => ({ key: c.id, label: c.name }));
  }, [categories]);

  useEffect(() => {
    if (visible) {
      setSelectedSort(initialSort || 'relevance');
      setSelectedPrices(initialFilters?.prices || []);
      setSelectedPackSizes(initialFilters?.packSizes || []);
      setSelectedDiscounts(initialFilters?.discounts || []);
      setSelectedTypes(initialFilters?.categoryIds || initialFilters?.types || []);
      setActiveTab((prev) => (prev === 'type' && (!categories || categories.length === 0) ? 'sort' : prev));
    }
  }, [visible]);

  const toggleArrayItem = (setter, item) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleClearAll = () => {
    setSelectedSort('relevance');
    setSelectedPrices([]);
    setSelectedPackSizes([]);
    setSelectedDiscounts([]);
    setSelectedTypes([]);
  };

  const handleShowResults = () => {
    onApply({
      ...initialFilters,
      sort: selectedSort,
      prices: selectedPrices,
      packSizes: selectedPackSizes,
      discounts: selectedDiscounts,
      types: selectedTypes,
      categoryIds: selectedTypes,
    });
    onClose();
  };

  const getTabBadge = (tabKey) => {
    if (tabKey === 'price' && selectedPrices.length > 0) return ` (${selectedPrices.length})`;
    if (tabKey === 'packSize' && selectedPackSizes.length > 0) return ` (${selectedPackSizes.length})`;
    if (tabKey === 'discount' && selectedDiscounts.length > 0) return ` (${selectedDiscounts.length})`;
    if (tabKey === 'type' && selectedTypes.length > 0) return ` (${selectedTypes.length})`;
    return '';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: '78%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

          {/* Header matching Image 3 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderColor: '#f1f5f9',
            }}
          >
            <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 18, fontWeight: 'normal', color: '#0f172a' }}>
              Filter & sort
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color="#0f172a" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* 2-Column Split Layout matching Image 3 */}
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {/* Left Sidebar */}
            <View
              style={{
                width: 130,
                backgroundColor: '#f8fafc',
                borderRightWidth: 1,
                borderColor: '#f1f5f9',
              }}
            >
              {availableTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const tabLabel = tab.label;
                const badge = getTabBadge(tab.key);
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 18,
                      paddingHorizontal: 16,
                      backgroundColor: isActive ? '#ffffff' : 'transparent',
                      position: 'relative',
                    }}
                  >
                    {/* Active Green Indicator Bar matching Image 3 */}
                    {isActive && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 3.5,
                          borderRadius: 2,
                          backgroundColor: '#059669',
                        }}
                      />
                    )}
                    <Text
                      style={{
                        fontFamily: isActive ? 'Inter-Bold' : 'Inter-Medium',
                        fontSize: 13.5,
                        fontWeight: 'normal',
                        color: isActive ? '#0f172a' : '#64748b',
                      }}
                      numberOfLines={1}
                    >
                      {tabLabel}
                      {badge && <Text style={{ fontFamily: 'Inter-Bold', color: '#059669', fontWeight: 'normal' }}>{badge}</Text>}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Right Content Pane */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
              style={{ flex: 1 }}
            >
              {/* Tab 1: Sort by matching Image 3 */}
              {activeTab === 'sort' &&
                SORT_OPTIONS.map((opt) => {
                  const isChecked = selectedSort === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setSelectedSort(opt.key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      {/* Radio matching Image 3 */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: isChecked ? 0 : 2,
                          borderColor: '#cbd5e1',
                          backgroundColor: isChecked ? '#059669' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: isChecked ? 'Inter-Bold' : 'Inter-Medium',
                          fontSize: 14.5,
                          fontWeight: 'normal',
                          color: isChecked ? '#0f172a' : '#334155',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}

              {/* Tab 2: Price matching Image 3 */}
              {activeTab === 'price' &&
                PRICE_OPTIONS.map((opt) => {
                  const isChecked = selectedPrices.includes(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => toggleArrayItem(setSelectedPrices, opt.key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: isChecked ? 0 : 2,
                          borderColor: '#cbd5e1',
                          backgroundColor: isChecked ? '#059669' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: isChecked ? 'Inter-Bold' : 'Inter-Medium',
                          fontSize: 14.5,
                          fontWeight: 'normal',
                          color: isChecked ? '#0f172a' : '#334155',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}

              {/* Tab 3: Pack size matching Image 3 */}
              {activeTab === 'packSize' &&
                PACK_SIZE_OPTIONS.map((opt) => {
                  const isChecked = selectedPackSizes.includes(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => toggleArrayItem(setSelectedPackSizes, opt.key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: isChecked ? 0 : 2,
                          borderColor: '#cbd5e1',
                          backgroundColor: isChecked ? '#059669' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: isChecked ? 'Inter-Bold' : 'Inter-Medium',
                          fontSize: 14.5,
                          fontWeight: 'normal',
                          color: isChecked ? '#0f172a' : '#334155',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}

              {/* Tab 4: Discount matching Image 3 */}
              {activeTab === 'discount' &&
                DISCOUNT_OPTIONS.map((opt) => {
                  const isChecked = selectedDiscounts.includes(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => toggleArrayItem(setSelectedDiscounts, opt.key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: isChecked ? 0 : 2,
                          borderColor: '#cbd5e1',
                          backgroundColor: isChecked ? '#059669' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: isChecked ? 'Inter-Bold' : 'Inter-Medium',
                          fontSize: 14.5,
                          fontWeight: 'normal',
                          color: isChecked ? '#0f172a' : '#334155',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}

              {/* Tab 5: Dynamic Categories or Types */}
              {activeTab === 'type' &&
                categoryOptions.map((opt) => {
                  const isChecked = selectedTypes.includes(opt.key);
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => toggleArrayItem(setSelectedTypes, opt.key)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: isChecked ? 0 : 2,
                          borderColor: '#cbd5e1',
                          backgroundColor: isChecked ? '#059669' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 14,
                        }}
                      >
                        {isChecked && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </View>
                      <Text
                        style={{
                          fontFamily: isChecked ? 'Inter-Bold' : 'Inter-Medium',
                          fontSize: 14.5,
                          fontWeight: 'normal',
                          color: isChecked ? '#0f172a' : '#334155',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>

          {/* Bottom Actions matching Image 3 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 16) + 6,
              borderTopWidth: 1,
              borderColor: '#f1f5f9',
              gap: 12,
            }}
          >
            <Pressable
              onPress={handleClearAll}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 14,
                borderWidth: 1.2,
                borderColor: '#e2e8f0',
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14.5, fontWeight: 'normal', color: '#0f172a' }}>
                Clear all
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShowResults}
              style={{
                flex: 1.3,
                height: 48,
                borderRadius: 14,
                backgroundColor: '#059669',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 14.5, fontWeight: 'normal', color: '#ffffff' }}>
                Show results
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
