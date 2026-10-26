import { getGridMetrics } from '../utils/responsiveLayout';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, FlatList, Pressable, StatusBar, ScrollView, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SlidersHorizontal,
  ChevronLeft,
  Search,
  ShoppingBag,
  LayoutGrid,
  Star,
  Tag,
} from '../components/icons';
import { Image } from 'expo-image';
import { collection, query, where, orderBy, onSnapshot } from '../services/reads';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import { Skeleton, ProductCard, CartBar, CART_BAR_SPACER } from '../components/ui';
import EmptyState from '../components/EmptyState';
import ProductFilterModal from '../components/ProductFilterModal';
import { useCart } from '../context/CartContext';
import {
  applyProductFilters,
  sortProducts,
  countActiveFilters,
  EMPTY_FILTERS,
  compareProductsDeterministic,
} from '../utils/productFilters';
import { getCategoryVisual } from '../utils/categoryImages';
import { fonts } from '../theme/typography';
import { isProductUnavailable } from '../utils/productAvailability';

const SORT_DROPDOWN_OPTIONS = [
  { key: 'price_asc', label: 'Price (Low To High)' },
  { key: 'price_desc', label: 'Price (High To Low)' },
  { key: 'discount_desc', label: 'Discount (High To Low)' },
];

const SIDEBAR_WIDTH = 78;
const GRID_PADDING = 10;
const GRID_GAP = 10;

let cachedAllCategories = [];
const categoryProductsCache = new Map();

export function setCachedCategories(categories) {
  if (Array.isArray(categories) && categories.length > 0) {
    cachedAllCategories = categories;
  }
}

export function getCachedCategories() {
  return cachedAllCategories;
}

export function setCachedCategoryProducts(categoryId, products) {
  if (categoryId && Array.isArray(products)) {
    categoryProductsCache.set(categoryId, products);
  }
}

export function getCachedCategoryProducts(categoryId) {
  return categoryProductsCache.get(categoryId);
}

export default function CategoryScreen({ route, navigation }) {
  const initialId = route.params?.id;
  const initialName = route.params?.name;
  const insets = useSafeAreaInsets();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const { items, addItem, updateQty, getQty } = useCart();

  const [paneWidth, setPaneWidth] = useState(null);
  // Measure the actual product pane, including split-screen and navigation constraints.
  const availableWidth = paneWidth ?? (windowWidth - SIDEBAR_WIDTH);
  const isTablet = windowWidth >= 600;
  const { columns, cardWidth } = getGridMetrics(availableWidth, {
    padding: GRID_PADDING,
    gap: GRID_GAP,
    minCardWidth: 110,
    minColumns: 2,
    maxColumns: isTablet ? 4 : 2,
  });

  const [currentCatId, setCurrentCatId] = useState(initialId);
  const [currentCatName, setCurrentCatName] = useState(initialName);

  const [products, setProducts] = useState(() => {
    if (initialId && categoryProductsCache.has(initialId)) {
      return categoryProductsCache.get(initialId);
    }
    return [];
  });
  const [subCategories, setSubCategories] = useState([]);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [brands, setBrands] = useState([]);
  const [allCategories, setAllCategories] = useState(() => {
    if (route.params?.allCategories?.length) {
      cachedAllCategories = route.params.allCategories;
      return route.params.allCategories;
    }
    return cachedAllCategories;
  });
  const [initialLoading, setInitialLoading] = useState(() => {
    return !initialId || !categoryProductsCache.has(initialId);
  });
  const [productsLoading, setProductsLoading] = useState(() => {
    return !initialId || !categoryProductsCache.has(initialId);
  });
  const [error, setError] = useState(false);
  const sidebarScrollRef = useRef(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null); // 'bestseller' | 'inStock' | 'under50'


  // Dynamic Sidebar: displays subcategories first (sorted), followed by sibling top-level categories
  const sidebarItems = useMemo(() => {
    const subs = allCategories
      .filter((c) => c.parentId === currentCatId)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    const otherTopCats = allCategories
      .filter((c) => !c.parentId && c.id !== currentCatId)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    const currentCat = allCategories.find((c) => c.id === currentCatId);

    if (subs.length > 0) {
      return [
        ...(currentCat ? [{ ...currentCat, isSubCategory: false }] : []),
        ...subs.map((s) => ({
          ...s,
          isSubCategory: true,
          parentCatId: currentCatId,
          parentName: currentCat?.name,
        })),
        ...otherTopCats.map((t) => ({ ...t, isSubCategory: false })),
      ];
    }

    return [
      ...(currentCat ? [{ ...currentCat, isSubCategory: false }] : []),
      ...otherTopCats.map((t) => ({ ...t, isSubCategory: false })),
    ];
  }, [allCategories, currentCatId]);

  // Sync route params changes
  useEffect(() => {
    if (route.params?.id) {
      setCurrentCatId(route.params.id);
      setCurrentCatName(route.params?.name || '');
    }
    if (route.params?.allCategories?.length) {
      cachedAllCategories = route.params.allCategories;
      setAllCategories(route.params.allCategories);
    }
  }, [route.params?.id, route.params?.name, route.params?.allCategories]);

  // Initial load of all categories and brands
  useEffect(() => {
    let isCancelled = false;
    let receivedLiveCategories = false;
    const unsubscribe = onSnapshot(
      query(collection(db, 'categories'), where('isActive', '==', true)),
      (snapshot) => {
        if (isCancelled) return;
        receivedLiveCategories = true;
        const liveCats = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        cachedAllCategories = liveCats;
        setAllCategories(liveCats);
      },
      () => {} // The public categories API below remains available as a fallback.
    );
    const loadCategories = async () => {
      try {
        const [catRes, brandRes] = await Promise.allSettled([
          apiClient.get('/categories'),
          apiClient.get('/brands'),
        ]);
        if (isCancelled) return;
        const cats = catRes.status === 'fulfilled' ? catRes.value.data.items || [] : [];
        if (!receivedLiveCategories) {
          const activeCats = cats.filter((c) => c.isActive !== false);
          cachedAllCategories = activeCats;
          setAllCategories(activeCats);
        }
        if (brandRes.status === 'fulfilled') setBrands(brandRes.value.data.items || []);
      } catch (_e) {
        // Fallback
      }
    };
    loadCategories();
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  // Pre-warm product cache and prefetch images for top categories in background
  useEffect(() => {
    if (!allCategories || allCategories.length === 0) return;
    const topCats = allCategories.filter((c) => !c.parentId);

    let cancelled = false;
    topCats.forEach((cat, index) => {
      if (categoryProductsCache.has(cat.id)) return;
      setTimeout(() => {
        if (cancelled) return;
        apiClient
          .get('/products', {
            params: { categoryId: cat.id, limit: 30 },
            __skipErrorToast: true,
          })
          .then((res) => {
            if (cancelled) return;
            const items = res.data?.items || [];
            if (items.length > 0) {
              categoryProductsCache.set(cat.id, items);
              const imgUrls = items
                .map((p) => p.imageUrl || p.image || p.images?.[0])
                .filter((url) => typeof url === 'string' && url.startsWith('http'));
              if (imgUrls.length > 0) {
                Image.prefetch(imgUrls);
              }
            }
          })
          .catch(() => {});
      }, 300 + index * 150);
    });

    return () => {
      cancelled = true;
    };
  }, [allCategories]);

  // Keep labels and filter options aligned with admin edits, including removals.
  useEffect(() => {
    setSubCategories(allCategories.filter((c) => c.parentId === currentCatId));
    const currentCategory = allCategories.find((c) => c.id === currentCatId);
    if (currentCategory) setCurrentCatName(currentCategory.name);
  }, [currentCatId, allCategories]);

  // Keep the product subscription stable when category documents are refreshed but
  // the actual category/child IDs have not changed.
  const productCategoryIds = useMemo(() => {
    const children = allCategories
      .filter((category) => category.parentId === currentCatId)
      .map((category) => category.id)
      .filter(Boolean)
      .sort();
    return [currentCatId, ...children].filter(Boolean);
  }, [allCategories, currentCatId]);
  const productCategoryIdsKey = productCategoryIds.join('|');

  // Real-time synchronization of category products with Firestore & Admin Portal
  useEffect(() => {
    let isCancelled = false;
    let unsubs = [];
    setError(false);
    if (!currentCatId) {
      setProductsLoading(false);
      setInitialLoading(false);
      return;
    }

    const allTargetIds = productCategoryIdsKey.split('|').filter(Boolean);

    const chunks = [];
    for (let i = 0; i < allTargetIds.length; i += 20) {
      chunks.push(allTargetIds.slice(i, i + 20));
    }

    const productsMap = new Map();
    if (categoryProductsCache.has(currentCatId)) {
      const cached = categoryProductsCache.get(currentCatId);
      cached.forEach((p) => productsMap.set(p.id, p));
    }

    let apiLoadFinished = false;

    const updateProductsFromMap = (force = false) => {
      if (isCancelled) return;
      if (!force && !apiLoadFinished && productsMap.size === 0) return;
      const list = Array.from(productsMap.values());
      list.sort(compareProductsDeterministic);
      if (list.length > 0 || apiLoadFinished) {
        categoryProductsCache.set(currentCatId, list);
        setProducts(list);
        setProductsLoading(false);
        setInitialLoading(false);

        const imgUrls = list
          .map((p) => p.imageUrl || p.image || p.images?.[0])
          .filter((u) => typeof u === 'string' && u.startsWith('http'));
        if (imgUrls.length > 0) {
          Image.prefetch(imgUrls);
        }
      }
    };

    // 1. Initial fast load from backend API if available
    const fetchCategoryProducts = async () => {
      try {
        let cursor = null;
        let isFirstPage = true;
        do {
          const { data } = await apiClient.get('/products', {
            params: { categoryId: currentCatId, limit: 50, ...(cursor ? { cursor } : {}) },
            __skipErrorToast: true,
          });
          if (isCancelled) return;
          (data?.items || []).forEach((product) => productsMap.set(product.id, product));
          cursor = data?.cursor || null;

          if (isFirstPage) {
            isFirstPage = false;
            updateProductsFromMap(true);
          }
        } while (cursor);
        apiLoadFinished = true;
        updateProductsFromMap(true);
      } catch {
        apiLoadFinished = true;
        updateProductsFromMap(true);
      }
    };
    fetchCategoryProducts();

    // 2. Real-time Firestore onSnapshot listeners for live pricing & stock changes
    try {
      chunks.forEach((batch) => {
        const q = query(
          collection(db, 'products'),
          where('categoryId', 'in', batch),
          orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(
          q,
          (snapshot) => {
            if (isCancelled) return;
            snapshot.docChanges().forEach((change) => {
              const docId = change.doc.id;
              if (change.type === 'removed') {
                productsMap.delete(docId);
              } else {
                productsMap.set(docId, { id: docId, ...change.doc.data() });
              }
            });
            updateProductsFromMap(true);
          },
          (err) => {
            console.warn('Category products snapshot error:', err.message || err);
            updateProductsFromMap(true);
            if (!isCancelled && productsMap.size === 0 && !categoryProductsCache.has(currentCatId)) {
              setError(true);
              setProductsLoading(false);
              setInitialLoading(false);
            }
          }
        );
        unsubs.push(unsub);
      });
    } catch (err) {
      console.error(err);
      if (!isCancelled && productsMap.size === 0 && !categoryProductsCache.has(currentCatId)) setError(true);
      setProductsLoading(false);
      setInitialLoading(false);
    }

    return () => {
      isCancelled = true;
      unsubs.forEach((u) => u && typeof u === 'function' && u());
    };
  }, [currentCatId, productCategoryIdsKey]);

  // Reset scroll and filters on category switch
  useEffect(() => {
    sidebarScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    if (categoryProductsCache.has(currentCatId)) {
      setProducts(categoryProductsCache.get(currentCatId));
      setProductsLoading(false);
    } else {
      setProducts([]);
      setProductsLoading(true);
    }
    setActiveSubCategory(null);
    setFilters(EMPTY_FILTERS);
    setQuickFilter(null);
    setSortDropdownVisible(false);
  }, [currentCatId]);

  const isOutOfStock = useCallback((p) => {
    if (p.availability === 'OUT_OF_STOCK' || p.availability === 'UNAVAILABLE_TODAY' || p.isAvailableToday === false) return true;
    if (p.variants?.length > 0) return p.variants.every((variant) => isProductUnavailable(p, variant));
    return isProductUnavailable(p);
  }, []);

  const visibleProducts = useMemo(() => {
    let list = activeSubCategory
      ? products.filter((p) => p.categoryId === activeSubCategory)
      : products;

    if (quickFilter === 'inStock') {
      list = list.filter((p) => !isOutOfStock(p));
    }

    if (quickFilter === 'under50') {
      list = list.filter((p) => {
        const pr = p.variants?.[0]?.offerPrice ?? p.variants?.[0]?.price ?? p.price ?? 0;
        return pr <= 50;
      });
    }

    if (quickFilter === 'bestseller') {
      list = list.filter((p) => p.isBestseller === true);
    }

    list = applyProductFilters(list, filters);
    const effectiveSort = sortKey || filters.sort;
    if (effectiveSort && effectiveSort !== 'relevance') {
      list = sortProducts(list, effectiveSort);
    }

    // Place all out-of-stock products at the end
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
  }, [products, activeSubCategory, quickFilter, filters, sortKey, isOutOfStock]);

  const activeFilterCount = countActiveFilters(filters);

  const renderProduct = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        layout="categoryGrid"
        cardWidth={cardWidth}
        onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
        qty={getQty(item.id, item.variants?.[0]?.id)}
        onAdd={() => addItem(item, item.variants?.[0])}
        onIncrement={() => addItem(item, item.variants?.[0])}
        onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
      />
    ),
    [cardWidth, getQty, addItem, updateQty, navigation]
  );

  const showFullSkeleton = initialLoading && !categoryProductsCache.has(currentCatId) && products.length === 0;
  if (showFullSkeleton) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'bottom']}>
        {/* Header Skeleton */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Skeleton width={32} height={32} borderRadius={16} />
            <Skeleton width={120} height={22} style={{ marginLeft: 12 }} />
          </View>
          <Skeleton width={32} height={32} borderRadius={16} />
        </View>

        {/* 2-Pane Skeleton */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: SIDEBAR_WIDTH, backgroundColor: '#f8fafc', padding: 6, gap: 12, borderRightWidth: 1, borderColor: '#e2e8f0' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <Skeleton width={48} height={48} borderRadius={16} />
                <Skeleton width={44} height={10} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1, padding: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Skeleton width={70} height={32} borderRadius={8} />
              <Skeleton width={70} height={32} borderRadius={8} />
              <Skeleton width={90} height={32} borderRadius={8} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[1, 2, 3, 4].map((k) => (
                <View key={k} style={{ width: cardWidth, marginBottom: 18 }}>
                  <Skeleton width="100%" height={cardWidth} borderRadius={16} style={{ marginBottom: 8 }} />
                  <Skeleton width="45%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={45} height={18} borderRadius={4} />
                    <Skeleton width={56} height={28} borderRadius={7} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-border-light">
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <Text className="text-lg font-black text-slate-900 ml-3">{currentCatName || 'Category'}</Text>
        </View>
        <EmptyState icon="error" message="Couldn't load products" />
      </SafeAreaView>
    );
  }

  const isAllActive = !activeSubCategory && !quickFilter && !sortKey && activeFilterCount === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER: Back arrow, Category name + items count, Naked Search icon matching Mockup */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={{
              padding: 4,
              marginRight: 6,
            }}
          >
            <ChevronLeft size={26} color="#0f172a" strokeWidth={2.4} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 19,
                fontWeight: 'normal',
                color: '#0f172a',
                letterSpacing: -0.4,
              }}
              numberOfLines={1}
            >
              {currentCatName}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, fontWeight: 'normal', color: '#64748b', marginTop: 1 }}>
              {productsLoading && visibleProducts.length === 0 ? 'Loading items...' : `${visibleProducts.length} items`}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Search')}
          hitSlop={12}
          style={{
            padding: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={22} color="#0f172a" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* MAIN TWO-PANE LAYOUT matching Mockup */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* LEFT VERTICAL SIDEBAR: Subcategories first, then sibling categories */}
        <View
          style={{
            width: SIDEBAR_WIDTH,
            height: '100%',
            backgroundColor: '#f8fafc',
            borderRightWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          <ScrollView
            ref={sidebarScrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            overScrollMode="never"
            bounces={true}
            contentContainerStyle={{
              paddingVertical: 6,
              paddingBottom: items.length > 0 ? CART_BAR_SPACER * Math.max(1, fontScale) + 24 : 16,
            }}
          >
            {sidebarItems.map((item) => {
              const isActive = activeSubCategory
                ? activeSubCategory === item.id
                : item.id === currentCatId;
              const visual = getCategoryVisual(item, 120);

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (item.isSubCategory) {
                      if (activeSubCategory === item.id) {
                        setActiveSubCategory(null);
                      } else {
                        setActiveSubCategory(item.id);
                      }
                    } else {
                      setActiveSubCategory(null);
                      if (currentCatId !== item.id) {
                        setCurrentCatId(item.id);
                        setCurrentCatName(item.name);
                        setActiveSubCategory(null);
                        if (categoryProductsCache.has(item.id)) {
                          setProducts(categoryProductsCache.get(item.id));
                          setProductsLoading(false);
                        } else {
                          setProductsLoading(true);
                        }
                      }
                    }
                  }}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 9,
                    paddingHorizontal: 2,
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    position: 'relative',
                    marginBottom: 2,
                  }}
                >
                  {/* Active Emerald Green Vertical Right Bar matching Mockup */}
                  {isActive && (
                    <View
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 8,
                        bottom: 8,
                        width: 3.5,
                        backgroundColor: '#059669',
                        borderTopLeftRadius: 3,
                        borderBottomLeftRadius: 3,
                      }}
                    />
                  )}

                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.2,
                      borderColor: isActive ? '#059669' : '#e2e8f0',
                      overflow: 'hidden',
                      padding: 2,
                    }}
                  >
                    {visual ? (
                      <Image
                        source={visual}
                        style={{ width: '100%', height: '100%', borderRadius: 12 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={0}
                      />
                    ) : (
                      <ShoppingBag size={20} color={isActive ? '#059669' : '#64748b'} />
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: isActive ? fonts.bold : fonts.medium,
                      fontSize: 10.5,
                      fontWeight: 'normal',
                      color: isActive ? '#0f172a' : '#475569',
                      textAlign: 'center',
                      marginTop: 4,
                      lineHeight: 13,
                      paddingHorizontal: 2,
                    }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* RIGHT MAIN CONTENT AREA */}
        <View
          style={{ flex: 1, minWidth: 0, backgroundColor: '#ffffff' }}
          onLayout={({ nativeEvent }) => setPaneWidth(nativeEvent.layout.width)}
        >
          {/* Top Filter & Sort Bar matching Mockup */}
          <View
            style={{
              paddingVertical: 8,
              paddingHorizontal: 8,
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
                  width: 36,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: activeFilterCount > 0 ? '#f0fdf4' : '#ffffff',
                  borderWidth: 1,
                  borderColor: activeFilterCount > 0 ? '#059669' : '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SlidersHorizontal size={14} color={activeFilterCount > 0 ? '#059669' : '#0f172a'} strokeWidth={2.2} />
              </Pressable>

              {/* All Chip matching Mockup */}
              <Pressable
                onPress={() => {
                  setActiveSubCategory(null);
                  setQuickFilter(null);
                  setSortKey(null);
                  setFilters(EMPTY_FILTERS);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isAllActive ? '#0f172a' : '#ffffff',
                  borderWidth: 1,
                  borderColor: isAllActive ? '#0f172a' : '#e2e8f0',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  height: 34,
                }}
              >
                <LayoutGrid size={13} color={isAllActive ? '#ffffff' : '#0f172a'} strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: isAllActive ? '#ffffff' : '#0f172a',
                  }}
                >
                  All
                </Text>
              </Pressable>

              {/* Bestseller is an admin-managed product flag, not a discount sort. */}
              <Pressable
                onPress={() => setQuickFilter((prev) => (prev === 'bestseller' ? null : 'bestseller'))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: quickFilter === 'bestseller' ? '#0f172a' : '#ffffff',
                  borderWidth: 1,
                  borderColor: quickFilter === 'bestseller' ? '#0f172a' : '#e2e8f0',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  height: 34,
                }}
              >
                <Star size={13} color={quickFilter === 'bestseller' ? '#ffffff' : '#0f172a'} strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text
                  style={{
                    fontFamily: fonts.semiBold,
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: quickFilter === 'bestseller' ? '#ffffff' : '#0f172a',
                  }}
                >
                  Bestsellers
                </Text>
              </Pressable>

              {/* Under ₹50 Chip matching Mockup */}
              <Pressable
                onPress={() => setQuickFilter((prev) => (prev === 'under50' ? null : 'under50'))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: quickFilter === 'under50' ? '#0f172a' : '#ffffff',
                  borderWidth: 1,
                  borderColor: quickFilter === 'under50' ? '#0f172a' : '#e2e8f0',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  height: 34,
                }}
              >
                <Tag size={13} color={quickFilter === 'under50' ? '#ffffff' : '#0f172a'} strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text
                  style={{
                    fontFamily: fonts.semiBold,
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: quickFilter === 'under50' ? '#ffffff' : '#0f172a',
                  }}
                >
                  Under ₹50
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 2-Column Product Grid with smooth 60fps scrolling & memory efficiency */}
          {productsLoading ? (
            <View style={{ padding: GRID_PADDING, flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <View
                  key={k}
                  style={{
                    width: cardWidth,
                    marginBottom: 18,
                  }}
                >
                  <Skeleton width="100%" height={cardWidth} borderRadius={16} style={{ marginBottom: 8 }} />
                  <Skeleton width="45%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={45} height={18} borderRadius={4} />
                    <Skeleton width={56} height={28} borderRadius={7} />
                  </View>
                </View>
              ))}
            </View>
          ) : visibleProducts.length === 0 ? (
            <EmptyState icon="search" message="No products match your selection" />
          ) : (
            <FlatList
              key={`cat-grid-${currentCatId}-${columns}`}
              data={visibleProducts}
              keyExtractor={(item) => item.id}
              extraData={items}
              numColumns={columns}
              columnWrapperStyle={columns > 1 ? { gap: GRID_GAP, justifyContent: 'flex-start' } : undefined}
              contentContainerStyle={{
                paddingHorizontal: GRID_PADDING,
                paddingTop: 8,
                paddingBottom: items.length > 0 ? CART_BAR_SPACER * Math.max(1, fontScale) + 24 : 16,
              }}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              renderItem={renderProduct}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={5}
              updateCellsBatchingPeriod={50}
              scrollEventThrottle={16}
              overScrollMode="never"
              removeClippedSubviews
            />
          )}
        </View>
      </View>

      {/* SORT DROPDOWN POPOVER (Matching Screenshot 4 exactly) */}
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
                        fontFamily: isSelected ? fonts.bold : fonts.medium,
                        fontSize: 13,
                        fontWeight: 'normal',
                        color: isSelected ? '#16a34a' : '#1e293b',
                      }}
                    >
                      {opt.label}
                    </Text>
                    {/* Radio Button matching Screenshot 4 */}
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

      {/* FLOATING VIEW CART BAR (Matching Image 3) - only when modal is closed */}
      <CartBar
        items={items}
        onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
      />

      {/* FILTER MODAL */}
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
        contextLabel={currentCatName}
        brands={brands}
        categories={subCategories}
      />

    </SafeAreaView>
  );
}
