import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Search as SearchIcon,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  SlidersHorizontal,
  Plus,
  Minus,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { Skeleton, CartBar, CART_BAR_SPACER } from '../components/ui';
import ProductFilterModal from '../components/ProductFilterModal';
import { useCart } from '../context/CartContext';
import { getCategoryVisual } from '../utils/categoryImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { getProductImageSource } from '../utils/productImages';
import { isProductUnavailable } from '../utils/productAvailability';

const RECENT_SEARCHES_KEY = '@supamart_recent_searches';
const DEFAULT_RECENT = ['dal', 'atta', 'milk', 'oil'];

// Fallback staple categories with local assets matching Image 1
const SYSTEM_POPULAR_CATEGORIES = [
  {
    id: 'rice-atta-grains',
    name: 'Rice',
    searchQuery: 'rice',
    image: require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp'),
  },
  {
    id: 'atta',
    name: 'Atta',
    searchQuery: 'atta',
    image: require('../../assets/Cleaned_Products/Elite Atta.webp'),
  },
  {
    id: 'cooking-oils-ghee',
    name: 'Oil',
    searchQuery: 'oil',
    image: require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp'),
  },
  {
    id: 'dal',
    name: 'Dal',
    searchQuery: 'dal',
    image: require('../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.webp'),
  },
  {
    id: 'fresh-vegetables',
    name: 'Tomato',
    searchQuery: 'tomato',
    image: require('../../assets/categories/home/fresh-vegetables.webp'),
  },
  {
    id: 'produce',
    name: 'Onion',
    searchQuery: 'onion',
    image: require('../../assets/categories/home/fresh-vegetables.webp'),
  },
  {
    id: 'dairy',
    name: 'Milk',
    searchQuery: 'milk',
    image: require('../../assets/categories/home/dairy-bread-eggs.webp'),
  },
  {
    id: 'bakery-items',
    name: 'Eggs',
    searchQuery: 'eggs',
    image: require('../../assets/categories/home/dairy-bread-eggs.webp'),
  },
];

export default function SearchScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const { items: cartItems, addItem, updateQty, getQty } = useCart();
  const initialQuery = route?.params?.initialQuery || route?.params?.q || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // 'preview' (Image 2 compact view) | 'grid' (Image 3 full 2-column view)
  const [isFullView, setIsFullView] = useState(false);
  const [recentSearches, setRecentSearches] = useState(DEFAULT_RECENT);
  const [apiCategories, setApiCategories] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    sort: 'relevance',
    prices: [],
    packSizes: [],
    discounts: [],
    types: [],
  });

  const debounceRef = useRef(null);

  // Load recent searches from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentSearches(parsed.slice(0, 6));
          }
        }
      } catch {
        // Fallback
      }
    })();
  }, []);

  // Fetch real categories from the system API (admin portal / backend)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get('/categories', { __skipErrorToast: true });
        const cats = data.items || [];
        setApiCategories(cats.filter((c) => !c.parentId));
      } catch {
        // Fallback to SYSTEM_POPULAR_CATEGORIES
      }
    })();
  }, []);

  const saveRecentSearch = useCallback(async (term) => {
    const clean = term.trim().toLowerCase();
    if (!clean) return;
    try {
      setRecentSearches((prev) => {
        const updated = [clean, ...prev.filter((s) => s.toLowerCase() !== clean)].slice(0, 6);
        AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch {
      // Ignore
    }
  }, []);

  const doSearch = useCallback(
    async (q, fullGrid = false) => {
      const term = q.trim();
      if (!term) {
        setResults([]);
        setSearched(false);
        setIsFullView(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      setIsFullView(fullGrid);
      saveRecentSearch(term);
      try {
        const { data } = await apiClient.get('/products/search', { params: { q: term, limit: 30 } });
        setResults(data.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [saveRecentSearch]
  );

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      doSearch(initialQuery, true);
    }
  }, [initialQuery, doSearch]);

  const handleChange = (text) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      setIsFullView(false);
      clearTimeout(debounceRef.current);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text, false), 350);
  };

  const handleSelectChip = (term, fullGrid = false) => {
    setQuery(term);
    doSearch(term, fullGrid);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setIsFullView(false);
  };

  // Filter and sort calculation matching Images 2 & 3
  const processedResults = useMemo(() => {
    let list = [...results];

    // Filter by price
    if (filters.prices.length > 0) {
      list = list.filter((item) => {
        const price = item.variants?.[0]?.offerPrice ?? item.variants?.[0]?.price ?? item.price ?? 0;
        return filters.prices.some((pKey) => {
          if (pKey === 'under_100') return price < 100;
          if (pKey === '100_300') return price >= 100 && price <= 300;
          if (pKey === '300_500') return price > 300 && price <= 500;
          if (pKey === 'above_500') return price > 500;
          return true;
        });
      });
    }

    // Filter by pack size
    if (filters.packSizes.length > 0) {
      list = list.filter((item) => {
        const label = (item.variants?.[0]?.label || item.unit || '').toLowerCase();
        return filters.packSizes.some((size) => label.includes(size.toLowerCase()));
      });
    }

    // Filter by discount
    if (filters.discounts.length > 0) {
      list = list.filter((item) => {
        const mrp = item.variants?.[0]?.price ?? item.price ?? 0;
        const offer = item.variants?.[0]?.offerPrice ?? mrp;
        const disc = mrp > 0 ? Math.round(((mrp - offer) / mrp) * 100) : 0;
        return filters.discounts.some((dKey) => {
          if (dKey === '10plus') return disc >= 10;
          if (dKey === '20plus') return disc >= 20;
          if (dKey === '30plus') return disc >= 30;
          if (dKey === '40plus') return disc >= 40;
          return true;
        });
      });
    }

    // Sort
    switch (filters.sort) {
      case 'price_asc':
        list.sort((a, b) => {
          const pa = a.variants?.[0]?.offerPrice ?? a.variants?.[0]?.price ?? a.price ?? 0;
          const pb = b.variants?.[0]?.offerPrice ?? b.variants?.[0]?.price ?? b.price ?? 0;
          return pa - pb;
        });
        break;
      case 'price_desc':
        list.sort((a, b) => {
          const pa = a.variants?.[0]?.offerPrice ?? a.variants?.[0]?.price ?? a.price ?? 0;
          const pb = b.variants?.[0]?.offerPrice ?? b.variants?.[0]?.price ?? b.price ?? 0;
          return pb - pa;
        });
        break;
      case 'discount':
        list.sort((a, b) => {
          const mrpA = a.variants?.[0]?.price ?? a.price ?? 0;
          const discA = mrpA > 0 ? Math.round(((mrpA - (a.variants?.[0]?.offerPrice ?? mrpA)) / mrpA) * 100) : 0;
          const mrpB = b.variants?.[0]?.price ?? b.price ?? 0;
          const discB = mrpB > 0 ? Math.round(((mrpB - (b.variants?.[0]?.offerPrice ?? mrpB)) / mrpB) * 100) : 0;
          return discB - discA;
        });
        break;
      case 'newest':
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'relevance':
      default:
        break;
    }

    return list;
  }, [results, filters]);

  const activeFilterCount =
    (filters.prices?.length || 0) +
    (filters.packSizes?.length || 0) +
    (filters.discounts?.length || 0) +
    (filters.types?.length || 0);

  const sortLabelMap = {
    relevance: 'Relevance',
    price_asc: 'Price: low to high',
    price_desc: 'Price: high to low',
    discount: 'Discount',
    newest: 'Newest',
  };

  // 4 columns calculation for categories in Image 1
  const colGap = 12;
  const paddingH = 18;
  const catItemWidth = Math.floor((width - paddingH * 2 - colGap * 3) / 4);

  const displayCategories = useMemo(() => {
    if (apiCategories.length > 0) {
      return apiCategories.slice(0, 16).map((cat) => ({
        id: cat.id,
        name: cat.name,
        searchQuery: cat.name,
        image: getCategoryVisual(cat, 180),
        rawCat: cat,
      }));
    }
    return SYSTEM_POPULAR_CATEGORIES;
  }, [apiCategories]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header with Back Arrow and Search Input with Green Border matching Images 1, 2, 3 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: '#ffffff',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <ChevronLeft size={26} color="#0f172a" strokeWidth={2.4} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderWidth: 1.5,
            borderColor: '#047857',
            borderRadius: 14,
            height: 48,
            paddingHorizontal: 12,
          }}
        >
          <SearchIcon size={18} color="#047857" strokeWidth={2.4} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 15,
              fontFamily: 'Inter-SemiBold',
              color: '#0f172a',
              height: '100%',
            }}
            placeholder="Search for atta, dal, oil..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={handleChange}
            autoFocus={!initialQuery}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query, true)}
          />
          {query.length > 0 && (
            <Pressable
              onPress={clear}
              hitSlop={8}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={13} color="#475569" strokeWidth={2.6} />
            </Pressable>
          )}
        </View>
      </View>

      {/* FULL GRID MODE HEADER: Filter & Sort Chips Row matching Image 3 */}
      {searched && isFullView && (
        <View style={{ borderBottomWidth: 1, borderColor: '#f1f5f9', paddingBottom: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
          >
            {/* Filters (N) Chip matching Image 3 */}
            <Pressable
              onPress={() => setShowFilterModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1.2,
                borderColor: '#cbd5e1',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <SlidersHorizontal size={14} color="#0f172a" strokeWidth={2.4} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#0f172a' }}>Filters</Text>
              {activeFilterCount > 0 && (
                <View
                  style={{
                    backgroundColor: '#047857',
                    borderRadius: 10,
                    width: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Inter-ExtraBold', color: '#ffffff' }}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Sort: [Label] Chip matching Image 3 */}
            <Pressable
              onPress={() => setShowFilterModal(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1.2,
                borderColor: '#cbd5e1',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#0f172a' }}>
                Sort: {sortLabelMap[filters.sort] || 'Relevance'}
              </Text>
              <ChevronDown size={14} color="#0f172a" strokeWidth={2.4} style={{ marginLeft: 5 }} />
            </Pressable>

            {/* Active Pack Size Filter Pills matching Image 3 */}
            {filters.packSizes.map((size) => (
              <Pressable
                key={size}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    packSizes: prev.packSizes.filter((s) => s !== size),
                  }))
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#e6f4ea',
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#047857', marginRight: 6 }}>
                  {size} packs
                </Text>
                <X size={13} color="#047857" strokeWidth={2.6} />
              </Pressable>
            ))}

            {/* Active Price Filter Pills */}
            {filters.prices.map((pKey) => {
              const label =
                pKey === 'under_100'
                  ? 'Under ₹100'
                  : pKey === '100_300'
                  ? '₹100-₹300'
                  : pKey === '300_500'
                  ? '₹300-₹500'
                  : 'Above ₹500';
              return (
                <Pressable
                  key={pKey}
                  onPress={() =>
                    setFilters((prev) => ({
                      ...prev,
                      prices: prev.prices.filter((p) => p !== pKey),
                    }))
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#e6f4ea',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter-Bold', color: '#047857', marginRight: 6 }}>
                    {label}
                  </Text>
                  <X size={13} color="#047857" strokeWidth={2.6} />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Results Count Subtitle matching Image 3 */}
          {!loading && (
            <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
              <Text style={{ fontSize: 13.5, color: '#64748b' }}>
                <Text style={{ fontFamily: 'Inter-ExtraBold', color: '#0f172a' }}>
                  {processedResults.length} {processedResults.length === 1 ? 'result' : 'results'}
                </Text>{' '}
                for &ldquo;{query}&rdquo;
              </Text>
            </View>
          )}
        </View>
      )}

      {/* COMPACT PREVIEW MODE HEADER matching Image 2 */}
      {searched && !isFullView && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: 'Inter-Bold', color: '#047857' }}>
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </Text>

          <Pressable
            onPress={() => setIsFullView(true)}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter-ExtraBold',
                color: '#047857',
                marginRight: 2,
              }}
            >
              See all results
            </Text>
            <ChevronRight size={16} color="#047857" strokeWidth={2.8} />
          </Pressable>
        </View>
      )}

      {/* INITIAL STATE matching Image 1: Recent searches + Popular in your area (Categories) */}
      {!searched && query.trim().length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Recent Searches matching Image 1 */}
          <Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 16.5,
              fontWeight: 'normal',
              color: '#0f172a',
              letterSpacing: -0.3,
              marginBottom: 12,
            }}
          >
            Recent searches
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 28,
            }}
          >
            {recentSearches.map((term) => (
              <Pressable
                key={term}
                onPress={() => handleSelectChip(term, false)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Clock size={14} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13.5, fontFamily: 'Inter-SemiBold', color: '#0f172a' }}>
                  {term}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Section 2: Popular in your area (Categories from system) matching Image 1 */}
          <Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 16.5,
              fontWeight: 'normal',
              color: '#0f172a',
              letterSpacing: -0.3,
              marginBottom: 14,
            }}
          >
            Popular in your area
          </Text>

          {/* 4-column Category Grid with rounded corner squares and centered label matching Image 1 */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 16,
            }}
          >
            {displayCategories.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  navigation.navigate('Category', {
                    id: item.id || item.categoryId,
                    name: item.name,
                  });
                }}
                style={{ width: catItemWidth, alignItems: 'center' }}
              >
                <View
                  style={{
                    width: catItemWidth,
                    height: catItemWidth,
                    borderRadius: 18,
                    backgroundColor: '#f8fafc',
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <Image
                    source={item.image}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 12.5,
                    fontWeight: 'normal',
                    color: '#0f172a',
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : loading ? (
        /* Loading Skeletons */
        <View
          style={{
            padding: 16,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: '48.5%', marginBottom: 14 }}>
              <Skeleton width="100%" height={135} borderRadius={16} />
              <Skeleton width="60%" height={16} borderRadius={4} className="mt-2" />
              <Skeleton width="40%" height={14} borderRadius={4} className="mt-1" />
            </View>
          ))}
        </View>
      ) : searched && results.length === 0 ? (
        /* Empty State */
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingBottom: cartItems.length > 0 ? CART_BAR_SPACER + 40 : 40,
          }}
        >
          <EmptyState icon="search" message={`No products found for "${query}"`} />
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
            Try searching for staples like milk, atta, oil, or rice.
          </Text>
        </View>
      ) : !isFullView ? (
        /* COMPACT PREVIEW MODE LIST matching Image 2 */
        <FlatList
          key="search-compact-list"
          data={results}
          keyExtractor={(item) => item.id}
          extraData={cartItems}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: cartItems.length > 0 ? CART_BAR_SPACER + 24 : 80,
          }}
          renderItem={({ item }) => {
            const variant = item.variants?.[0];
            const price = variant?.offerPrice ?? variant?.price ?? item.price ?? 0;
            const mrp = variant?.price ?? item.price ?? 0;
            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            const packSize = variant?.label || item.unit || 'Standard pack';
            const qty = getQty(item.id, variant?.id);
            const isOutOfStock = item.isOutOfStock || isProductUnavailable(item, variant);
            const imgSource =
              getProductImageSource(item, 200) || { uri: optimizeCloudinaryUrl(item.image, 200) };

            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: '#ffffff',
                  borderBottomWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                {/* Left Thumbnail matching Image 2 */}
                <Pressable
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id, isOutOfStock })}
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 12,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    overflow: 'hidden',
                    marginRight: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                  }}
                >
                  <Image source={imgSource} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                </Pressable>

                {/* Middle Info matching Image 2 */}
                <Pressable
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id, isOutOfStock })}
                  style={{ flex: 1, paddingRight: 10 }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter-Bold',
                      fontSize: 14.5,
                      fontWeight: 'normal',
                      color: '#0f172a',
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 12.5,
                      fontWeight: 'normal',
                      color: '#64748b',
                      marginTop: 2,
                    }}
                  >
                    {packSize}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text
                      style={{
                        fontFamily: 'Inter-ExtraBold',
                        fontSize: 15.5,
                        fontWeight: 'normal',
                        color: '#0f172a',
                      }}
                    >
                      ₹{price}
                    </Text>
                    {discount > 0 && (
                      <Text
                        style={{
                          fontSize: 12.5,
                          color: '#94a3b8',
                          textDecorationLine: 'line-through',
                          marginLeft: 6,
                        }}
                      >
                        ₹{mrp}
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Right Action Button matching Image 2 */}
                {isOutOfStock ? (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#94a3b8' }}>
                    Out of stock
                  </Text>
                ) : qty === 0 ? (
                  <Pressable
                    onPress={() => addItem(item, variant)}
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#047857',
                      borderRadius: 10,
                      paddingHorizontal: 20,
                      paddingVertical: 7,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'Inter-ExtraBold', color: '#047857' }}>
                      ADD
                    </Text>
                  </Pressable>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#047857',
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      height: 32,
                    }}
                  >
                    <Pressable
                      onPress={() => updateQty(item.id, variant?.id, -1)}
                      hitSlop={6}
                      style={{ paddingHorizontal: 5 }}
                    >
                      <Minus size={13} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: 'Inter-ExtraBold',
                        color: '#ffffff',
                        marginHorizontal: 4,
                      }}
                    >
                      {qty}
                    </Text>
                    <Pressable
                      onPress={() => addItem(item, variant)}
                      hitSlop={6}
                      style={{ paddingHorizontal: 5 }}
                    >
                      <Plus size={13} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        /* FULL 2-COLUMN GRID MODE matching Image 3 */
        <FlatList
          key="search-grid-2col"
          data={processedResults}
          keyExtractor={(item) => item.id}
          extraData={cartItems}
          numColumns={2}
          columnWrapperStyle={{
            gap: 12,
            paddingHorizontal: 16,
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: cartItems.length > 0 ? CART_BAR_SPACER + 32 : 110,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const variant = item.variants?.[0];
            const price = variant?.offerPrice ?? variant?.price ?? item.price ?? 0;
            const mrp = variant?.price ?? item.price ?? 0;
            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            const packSize = variant?.label || item.unit || 'Standard pack';
            const qty = getQty(item.id, variant?.id);
            const isOutOfStock = item.isOutOfStock || isProductUnavailable(item, variant);
            const imgSource =
              getProductImageSource(item, 300) || { uri: optimizeCloudinaryUrl(item.image, 300) };

            return (
              <Animated.View
                entering={FadeInDown.duration(300).delay(Math.min(index * 35, 200))}
                style={{ width: '48.2%' }}
              >
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 5,
                    elevation: 1,
                  }}
                >
                  {/* Image container with discount tag matching Image 3 */}
                  <Pressable
                    onPress={() =>
                      navigation.navigate('ProductDetail', { id: item.id, isOutOfStock })
                    }
                    style={{
                      width: '100%',
                      height: 136,
                      borderRadius: 14,
                      backgroundColor: '#f8fafc',
                      overflow: 'hidden',
                      position: 'relative',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                    }}
                  >
                    <Image
                      source={imgSource}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />

                    {/* Amber Discount Badge matching Image 3 */}
                    {discount > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          backgroundColor: '#f59e0b',
                          paddingHorizontal: 7,
                          paddingVertical: 4,
                          borderBottomRightRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontFamily: 'Inter-ExtraBold', color: '#ffffff' }}>
                          {discount}% OFF
                        </Text>
                      </View>
                    )}

                    {/* Dark Pill Out of Stock Overlay matching Image 3 */}
                    {isOutOfStock && (
                      <View
                        style={{
                          position: 'absolute',
                          backgroundColor: 'rgba(15, 23, 42, 0.72)',
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: 'Inter-ExtraBold', color: '#ffffff' }}>
                          OUT OF STOCK
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  {/* Pack size & Title matching Image 3 */}
                  <Text
                    style={{
                      fontFamily: 'Inter-SemiBold',
                      fontSize: 11.5,
                      color: '#64748b',
                      marginTop: 8,
                    }}
                    numberOfLines={1}
                  >
                    {packSize}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'Inter-Bold',
                      fontSize: 13.5,
                      color: '#0f172a',
                      marginTop: 2,
                      marginBottom: 10,
                    }}
                  >
                    {item.name}
                  </Text>

                  {/* Price Row & Action Button matching Image 3 */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 15.5, color: '#0f172a' }}>
                        ₹{price}
                      </Text>
                      {discount > 0 && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#94a3b8',
                            textDecorationLine: 'line-through',
                            marginTop: 1,
                          }}
                        >
                          ₹{mrp}
                        </Text>
                      )}
                    </View>

                    {/* Button matching Image 3: ADD / Stepper OR Notify me */}
                    {isOutOfStock ? (
                      <Pressable
                        onPress={() =>
                          navigation.navigate('ProductDetail', { id: item.id, isOutOfStock: true })
                        }
                        style={{
                          borderWidth: 1.2,
                          borderColor: '#cbd5e1',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: 'Inter-Bold', color: '#334155' }}>
                          Notify me
                        </Text>
                      </Pressable>
                    ) : qty === 0 ? (
                      <Pressable
                        onPress={() => addItem(item, variant)}
                        style={{
                          borderWidth: 1.5,
                          borderColor: '#047857',
                          borderRadius: 10,
                          paddingHorizontal: 18,
                          paddingVertical: 6,
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontFamily: 'Inter-ExtraBold', color: '#047857' }}>
                          ADD
                        </Text>
                      </Pressable>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#047857',
                          borderRadius: 10,
                          paddingHorizontal: 4,
                          height: 32,
                        }}
                      >
                        <Pressable
                          onPress={() => updateQty(item.id, variant?.id, -1)}
                          hitSlop={6}
                          style={{ paddingHorizontal: 5 }}
                        >
                          <Minus size={13} color="#ffffff" strokeWidth={3} />
                        </Pressable>
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: 'Inter-ExtraBold',
                            color: '#ffffff',
                            marginHorizontal: 4,
                          }}
                        >
                          {qty}
                        </Text>
                        <Pressable
                          onPress={() => addItem(item, variant)}
                          hitSlop={6}
                          style={{ paddingHorizontal: 5 }}
                        >
                          <Plus size={13} color="#ffffff" strokeWidth={3} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />
      )}

      {/* Floating Cart Bar */}
      <CartBar
        items={cartItems}
        onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
      />

      {/* Unified Filter & Sort Modal matching Image 3 */}
      <ProductFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        initialSort={filters.sort}
        initialFilters={filters}
        categories={apiCategories}
        onApply={(updated) => {
          setFilters(updated);
          setIsFullView(true);
        }}
      />
    </SafeAreaView>
  );
}
