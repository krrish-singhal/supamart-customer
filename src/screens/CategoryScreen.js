import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import { Skeleton, ProductCard, Header, CartBar, CART_BAR_SPACER } from '../components/ui';
import EmptyState from '../components/EmptyState';
import ProductFilterModal from '../components/ProductFilterModal';
import ProductSortModal from '../components/ProductSortModal';
import { useCart } from '../context/CartContext';
import { applyProductFilters, sortProducts, countActiveFilters, EMPTY_FILTERS } from '../utils/productFilters';

export default function CategoryScreen({ route, navigation }) {
  const { id, name } = route.params;
  const { items, addItem, updateQty, getQty } = useCart();
  const [products, setProducts] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [brands, setBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState('popularity');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    setLoading(true);
    setError(false);
    setActiveSubCategory(null);
    setFilters(EMPTY_FILTERS);

    const load = async () => {
      try {
        const [catRes, brandRes] = await Promise.allSettled([
          apiClient.get('/categories'),
          apiClient.get('/brands'),
        ]);
        const cats = catRes.status === 'fulfilled' ? catRes.value.data.items || [] : [];
        setAllCategories(cats);
        setSubCategories(cats.filter((c) => c.parentId === id));
        if (brandRes.status === 'fulfilled') setBrands(brandRes.value.data.items || []);

        const subIds = cats.filter((c) => c.parentId === id).map((c) => c.id);
        const ids = [id, ...subIds].slice(0, 10);
        const q = query(collection(db, 'products'), where('categoryId', 'in', ids));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setProducts(list);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, name, navigation]);

  const visibleProducts = useMemo(() => {
    let list = activeSubCategory ? products.filter((p) => p.categoryId === activeSubCategory) : products;
    list = applyProductFilters(list, filters);
    return sortProducts(list, sortKey);
  }, [products, activeSubCategory, filters, sortKey]);

  const activeFilterCount = countActiveFilters(filters);

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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
        <Header title={name} onBack={() => navigation.goBack()} />
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={116} borderRadius={16} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <Header title={name} onBack={() => navigation.goBack()} />
      <EmptyState icon="error" message="Couldn't load products" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title={name} onBack={() => navigation.goBack()} />

      {/* Category pill + Filter/Sort bar */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-primary-50">
        <View className="flex-row items-center bg-white rounded-lg pl-3 pr-1.5 py-1.5 border border-border-light">
          <Text className="text-sm font-bold text-text-primary mr-1">{name}</Text>
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
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
      </View>

      {/* Sub-category pills */}
      {subCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'flex-start' }}
          style={{ flexGrow: 0 }}
          className="bg-white border-b border-border-light"
        >
          <Pressable
            onPress={() => setActiveSubCategory(null)}
            className={`px-4 py-2 rounded-lg border ${!activeSubCategory ? 'bg-primary-600 border-primary-600' : 'bg-white border-border'}`}
          >
            <Text className={`text-xs font-bold ${!activeSubCategory ? 'text-white' : 'text-text-primary'}`}>All</Text>
          </Pressable>
          {subCategories.map((sc) => (
            <Pressable
              key={sc.id}
              onPress={() => setActiveSubCategory(sc.id)}
              className={`px-4 py-2 rounded-lg border ${activeSubCategory === sc.id ? 'bg-primary-600 border-primary-600' : 'bg-white border-border'}`}
            >
              <Text className={`text-xs font-bold ${activeSubCategory === sc.id ? 'text-white' : 'text-text-primary'}`}>
                {sc.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {visibleProducts.length === 0 ? (
        <EmptyState icon="search" message="No products match your filters" />
      ) : (
        <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
          <FlatList
            data={visibleProducts}
            keyExtractor={(item) => item.id}
            extraData={items}
            contentContainerStyle={{ padding: 16, paddingBottom: CART_BAR_SPACER + 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
            renderItem={renderProduct}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={9}
            removeClippedSubviews
          />
        </Animated.View>
      )}

      <CartBar items={items} onPress={() => navigation.navigate('Main', { screen: 'Cart' })} />

      <ProductFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
        initialFilters={filters}
        contextLabel={name}
        brands={brands}
        categories={allCategories.filter((c) => !c.parentId)}
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
