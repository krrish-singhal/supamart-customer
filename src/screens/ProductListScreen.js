import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, StatusBar, Pressable, ScrollView, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlidersHorizontal, ArrowUpDown, ArrowLeft, Search, CheckCircle } from 'lucide-react-native';
import apiClient from '../services/api';
import { Skeleton, ProductCard, CartBar, CART_BAR_SPACER } from '../components/ui';
import EmptyState from '../components/EmptyState';
import ProductFilterModal from '../components/ProductFilterModal';
import ProductDetailModal from '../components/ProductDetailModal';
import { useCart } from '../context/CartContext';
import { applyProductFilters, sortProducts, countActiveFilters, EMPTY_FILTERS } from '../utils/productFilters';
import { isProductUnavailable } from '../utils/productAvailability';

const SORT_DROPDOWN_OPTIONS = [
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'discount_desc', label: 'Discount' },
];

export default function ProductListScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Padding 10 on each side (20 total) + gap of 8 between 2 cards:
  const cardWidth = Math.max(120, Math.floor((windowWidth - 28) / 2));
  const { featured, categoryId, brandId, title } = route.params || {};
  const { items: cartItems, addItem, updateQty, getQty } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryId || null);
  const [quickFilter, setQuickFilter] = useState(null); // 'inStock' | null
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState(null);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);

  const screenTitle = title || (featured ? 'Featured' : 'Products');

  const fetchItems = useCallback(async (nextCursor = null) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!nextCursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = { limit: 24, cursor: nextCursor };
      if (featured) params.featured = 'true';
      if (categoryId) params.categoryId = categoryId;
      if (brandId) params.brandId = brandId;
      const { data } = await apiClient.get('/products', { params });
      setItems((prev) => {
        const merged = nextCursor ? [...prev, ...data.items] : data.items;
        return Array.from(new Map(merged.map((i) => [i.id, i])).values());
      });
      setCursor(data.cursor || null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [featured, categoryId, brandId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchItems();
  }, [fetchItems, navigation]);

  useEffect(() => {
    const loadFacets = async () => {
      const [catRes, brandRes] = await Promise.allSettled([
        apiClient.get('/categories'),
        apiClient.get('/brands'),
      ]);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data.items || []);
      if (brandRes.status === 'fulfilled') setBrands(brandRes.value.data.items || []);
    };
    loadFacets();
  }, []);

  const isOutOfStock = useCallback((p) => {
    if (p.availability === 'OUT_OF_STOCK' || p.availability === 'UNAVAILABLE_TODAY' || p.isAvailableToday === false) return true;
    if (p.variants?.length > 0) return p.variants.every((variant) => isProductUnavailable(p, variant));
    return isProductUnavailable(p);
  }, []);

  const visibleItems = useMemo(() => {
    let list = items;
    if (selectedCategory) {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (quickFilter === 'inStock') {
      list = list.filter((p) => !isOutOfStock(p));
    }
    list = applyProductFilters(list, filters);
    if (sortKey) {
      list = sortProducts(list, sortKey);
    }

    // Place out of stock products at the end
    const inStockList = [];
    const outOfStockList = [];
    for (const p of list) {
      if (isOutOfStock(p)) {
        outOfStockList.push(p);
      } else {
        inStockList.push(p);
      }
    }
    return [...inStockList, ...outOfStockList];
  }, [items, selectedCategory, quickFilter, filters, sortKey, isOutOfStock]);

  const activeFilterCount = countActiveFilters(filters);

  const renderProduct = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        layout="categoryGrid"
        cardWidth={cardWidth}
        onPress={() => setSelectedModalProduct(item)}
        qty={getQty(item.id, item.variants?.[0]?.id)}
        onAdd={() => addItem(item, item.variants?.[0])}
        onIncrement={() => addItem(item, item.variants?.[0])}
        onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
      />
    ),
    [cardWidth, getQty, addItem, updateQty]
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER: Back arrow, Title, Search icon (Matching Image 2 exactly) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={{
              padding: 4,
              marginRight: 6,
              borderRadius: 20,
            }}
          >
            <ArrowLeft size={22} color="#0f172a" strokeWidth={2.2} />
          </Pressable>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '900',
              color: '#0f172a',
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {screenTitle}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Search')}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#f8fafc',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={19} color="#0f172a" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* FILTER & SORT BAR (Matching Image 2 exactly) */}
      <View
        style={{
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          backgroundColor: '#ffffff',
          zIndex: 15,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
        >
          {/* Filter Button */}
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: activeFilterCount > 0 ? '#f0fdf4' : '#f8fafc',
              borderWidth: 1,
              borderColor: activeFilterCount > 0 ? '#16a34a' : '#e2e8f0',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <SlidersHorizontal size={13} color={activeFilterCount > 0 ? '#16a34a' : '#475569'} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: activeFilterCount > 0 ? '#16a34a' : '#475569',
                marginLeft: 4,
              }}
            >
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </Pressable>

          {/* Price Sort Button -> Toggles Popover */}
          <Pressable
            onPress={() => setSortDropdownVisible((prev) => !prev)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: sortKey ? '#f0fdf4' : '#f8fafc',
              borderWidth: 1,
              borderColor: sortKey ? '#16a34a' : '#e2e8f0',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <ArrowUpDown size={13} color={sortKey ? '#16a34a' : '#475569'} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: sortKey ? '#16a34a' : '#475569',
                marginLeft: 4,
              }}
            >
              {sortKey ? (SORT_DROPDOWN_OPTIONS.find((o) => o.key === sortKey)?.label || 'Price') : 'Price'}
            </Text>
          </Pressable>

          {/* In Stock Quick Filter */}
          <Pressable
            onPress={() => setQuickFilter((prev) => (prev === 'inStock' ? null : 'inStock'))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: quickFilter === 'inStock' ? '#f0fdf4' : '#f8fafc',
              borderWidth: 1,
              borderColor: quickFilter === 'inStock' ? '#16a34a' : '#e2e8f0',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <CheckCircle size={13} color={quickFilter === 'inStock' ? '#16a34a' : '#64748b'} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: quickFilter === 'inStock' ? '#16a34a' : '#475569',
                marginLeft: 4,
              }}
            >
              In Stock
            </Text>
          </Pressable>

          {/* Category Chips if multiple categories exist */}
          {categories.length > 0 && categories.slice(0, 10).map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory((prev) => (prev === cat.id ? null : cat.id))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#f0fdf4' : '#f8fafc',
                  borderWidth: 1,
                  borderColor: isSelected ? '#16a34a' : '#e2e8f0',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isSelected ? '#16a34a' : '#475569',
                  }}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2-COLUMN PRODUCT GRID */}
      {loading ? (
        <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: '48.8%', marginBottom: 12 }}>
              <Skeleton width="100%" height={130} borderRadius={12} />
              <Skeleton width="60%" height={16} borderRadius={4} className="mt-2" />
              <Skeleton width="40%" height={14} borderRadius={4} className="mt-1" />
            </View>
          ))}
        </View>
      ) : visibleItems.length === 0 ? (
        <EmptyState icon="search" message="No products match your filters" />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          extraData={cartItems}
          numColumns={2}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 10, justifyContent: 'flex-start' }}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: cartItems.length > 0 ? CART_BAR_SPACER + 24 : 32,
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => cursor && fetchItems(cursor)}
          onEndReachedThreshold={0.4}
          renderItem={renderProduct}
          initialNumToRender={14}
          maxToRenderPerBatch={16}
          windowSize={21}
          scrollEventThrottle={16}
          overScrollMode="never"
          removeClippedSubviews={false}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 12 }}>
                <View style={{ width: '48.8%' }}>
                  <Skeleton width="100%" height={130} borderRadius={12} />
                  <Skeleton width="60%" height={16} borderRadius={4} className="mt-2" />
                  <Skeleton width="40%" height={14} borderRadius={4} className="mt-1" />
                </View>
                <View style={{ width: '48.8%' }}>
                  <Skeleton width="100%" height={130} borderRadius={12} />
                  <Skeleton width="60%" height={16} borderRadius={4} className="mt-2" />
                  <Skeleton width="40%" height={14} borderRadius={4} className="mt-1" />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* SORT DROPDOWN POPOVER MODAL (Matching CategoryScreen) */}
      {sortDropdownVisible && (
        <Modal
          transparent
          visible={sortDropdownVisible}
          animationType="fade"
          onRequestClose={() => setSortDropdownVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.12)' }}
            onPress={() => setSortDropdownVisible(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: (insets.top || 20) + 76,
                right: 16,
                width: 220,
                backgroundColor: '#ffffff',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingVertical: 4,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.16,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              {SORT_DROPDOWN_OPTIONS.map((opt, i) => {
                const isSelected = sortKey === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      setSortKey(opt.key);
                      setSortDropdownVisible(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: i < SORT_DROPDOWN_OPTIONS.length - 1 ? 1 : 0,
                      borderColor: '#f1f5f9',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '800' : '500',
                        color: isSelected ? '#16a34a' : '#1e293b',
                      }}
                    >
                      {opt.label}
                    </Text>
                    {/* Radio Button */}
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: isSelected ? '#16a34a' : '#94a3b8',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {isSelected && (
                        <View
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 4.5,
                            backgroundColor: '#16a34a',
                          }}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Floating Cart Bar */}
      <CartBar items={cartItems} onPress={() => navigation.navigate('Main', { screen: 'Cart' })} />

      {/* Advanced Filter Modal */}
      <ProductFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(applied) => {
          setFilters(applied);
          if (applied.sort) {
            setSortKey(applied.sort === 'relevance' ? null : applied.sort);
          }
        }}
        initialSort={sortKey || filters.sort || 'relevance'}
        initialFilters={filters}
        contextLabel={screenTitle}
        brands={brands}
        categories={categories.filter((c) => !c.parentId)}
      />

      {/* Product Detail Bottom Sheet Modal (Image 3) */}
      <ProductDetailModal
        visible={!!selectedModalProduct}
        product={selectedModalProduct}
        onClose={() => setSelectedModalProduct(null)}
        categoryProducts={items}
        onAddToCart={(item, variant) => addItem(item, variant)}
        onUpdateQty={(productId, variantId, delta) => updateQty(productId, variantId, delta)}
        getQty={getQty}
        categoryName={screenTitle}
      />
    </SafeAreaView>
  );
}
