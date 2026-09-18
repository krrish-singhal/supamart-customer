import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import apiClient from '../services/api';
import { Skeleton, ProductCard, Header, CartBar, CART_BAR_SPACER } from '../components/ui';
import EmptyState from '../components/EmptyState';
import ProductFilterModal from '../components/ProductFilterModal';
import ProductSortModal from '../components/ProductSortModal';
import { useCart } from '../context/CartContext';
import { applyProductFilters, sortProducts, countActiveFilters, EMPTY_FILTERS } from '../utils/productFilters';

export default function ProductListScreen({ navigation, route }) {
  const { featured, categoryId, brandId, title } = route.params || {};
  const { items: cartItems, addItem, updateQty, getQty } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('popularity');

  const screenTitle = title || (featured ? 'Featured' : 'Products');

  const renderProduct = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        layout="list"
        onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
        qty={getQty(item.id, item.variants?.[0]?.id)}
        onAdd={() => addItem(item, item.variants?.[0])}
        onIncrement={() => addItem(item, item.variants?.[0])}
        onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
      />
    ),
    [navigation, getQty, addItem, updateQty]
  );

  const fetchItems = useCallback(async (nextCursor = null) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!nextCursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = { limit: 20, cursor: nextCursor };
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

  const visibleItems = useMemo(() => {
    return sortProducts(applyProductFilters(items, filters), sortKey);
  }, [items, filters, sortKey]);

  const activeFilterCount = countActiveFilters(filters);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
        <Header title={screenTitle} onBack={() => navigation.goBack()} />
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={116} borderRadius={16} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!items.length) return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <Header title={screenTitle} onBack={() => navigation.goBack()} />
      <EmptyState icon="box" message="No products found" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title={screenTitle} onBack={() => navigation.goBack()} />

      <View className="flex-row items-center justify-end px-4 py-2 bg-primary-50" style={{ gap: 8 }}>
        <Pressable
          onPress={() => setFilterVisible(true)}
          className="flex-row items-center bg-white rounded-lg px-3 py-1.5 border border-border-light"
        >
          <SlidersHorizontal size={14} color="#16a34a" />
          <Text className="text-xs font-bold text-primary-600 ml-1.5">
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSortVisible(true)}
          className="flex-row items-center bg-white rounded-lg px-3 py-1.5 border border-border-light"
        >
          <ArrowUpDown size={14} color="#16a34a" />
          <Text className="text-xs font-bold text-primary-600 ml-1.5">Sort</Text>
        </Pressable>
      </View>

      {visibleItems.length === 0 ? (
        <EmptyState icon="search" message="No products match your filters" />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          extraData={cartItems}
          contentContainerStyle={{ padding: 16, paddingBottom: cartItems.length > 0 ? CART_BAR_SPACER + 16 : 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => cursor && fetchItems(cursor)}
          onEndReachedThreshold={0.4}
          renderItem={renderProduct}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={9}
          removeClippedSubviews
          ListFooterComponent={
            loadingMore ? (
              <View className="items-center py-4">
                <Text className="text-sm font-medium text-text-tertiary">Loading more…</Text>
              </View>
            ) : null
          }
        />
      )}

      <CartBar items={cartItems} onPress={() => navigation.navigate('Main', { screen: 'Cart' })} />

      <ProductFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        initialFilters={filters}
        contextLabel={screenTitle}
        brands={brands}
        categories={categories.filter((c) => !c.parentId)}
      />
      <ProductSortModal
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        onApply={setSortKey}
        initialSort={sortKey}
      />
    </SafeAreaView>
  );
}
