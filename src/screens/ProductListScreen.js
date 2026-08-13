import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import apiClient from '../services/api';
import { Skeleton, ProductCard, Header } from '../components/ui';
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
          contentContainerStyle={{ padding: 16, paddingBottom: cartItems.length > 0 ? 100 : 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          onEndReached={() => cursor && fetchItems(cursor)}
          onEndReachedThreshold={0.4}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index < 8 ? index * 30 : 0)}>
              <ProductCard
                item={item}
                layout="list"
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                qty={getQty(item.id, item.variants?.[0]?.id)}
                onAdd={() => addItem(item, item.variants?.[0])}
                onIncrement={() => addItem(item, item.variants?.[0])}
                onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
              />
            </Animated.View>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View className="items-center py-4">
                <Text className="text-sm font-medium text-text-tertiary">Loading more…</Text>
              </View>
            ) : null
          }
        />
      )}

      {cartItems.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={{
            position: 'absolute', bottom: 20, left: 16, right: 16,
            backgroundColor: '#16a34a', borderRadius: 8,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 16, paddingVertical: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 8, elevation: 5
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>
              {cartItems.reduce((sum, item) => sum + item.qty, 0)} Item{cartItems.length > 1 ? 's' : ''}
            </Text>
            <View style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 10 }} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
              ₹{cartItems.reduce((sum, item) => sum + ((item.price ?? 0) * item.qty), 0)}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
            style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 }}
          >
            <Text style={{ color: '#16a34a', fontSize: 14, fontWeight: '800' }}>
              View Cart
            </Text>
          </Pressable>
        </Animated.View>
      )}

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
