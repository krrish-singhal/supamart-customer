import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, ShoppingBag, Utensils, Coffee, Sparkles, Layers } from '../components/icons';
import apiClient from '../services/api';
import { Skeleton } from '../components/ui';
import { getCategoryVisual } from '../utils/categoryImages';
import slugify from '../utils/slugify';
import { setCachedCategories, getCachedCategoryProducts, setCachedCategoryProducts } from './CategoryScreen';

export default function CategoriesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4 columns calculation for clean grid layout matching reference design
  const paddingH = 16;
  const colGap = 10;
  const cardWidth = Math.floor((width - paddingH * 2 - colGap * 3) / 4);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get('/categories', { __skipErrorToast: true });
        if (isCancelled) return;
        const cats = data.items || [];
        setAllCategories(cats);
        setCachedCategories(cats);
      } catch {
        // Fallbacks
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Top level categories sorted by admin order
  const topLevelCategories = useMemo(() => {
    const list = allCategories.filter((c) => !c.parentId && c.isActive !== false);
    list.sort((a, b) => {
      const orderA = a.order != null ? Number(a.order) : 999;
      const orderB = b.order != null ? Number(b.order) : 999;
      return orderA - orderB;
    });
    return list;
  }, [allCategories]);

  // Grouped departments matching the store layout
  const { popularList, staplesList, snacksList, homeList } = useMemo(() => {
    const popular = [];
    const staples = [];
    const snacks = [];
    const home = [];

    topLevelCategories.forEach((cat) => {
      const slug = slugify(cat.name || '');
      if (
        slug.includes('fresh') ||
        slug.includes('vegetable') ||
        slug.includes('dairy') ||
        slug.includes('bakery')
      ) {
        popular.push(cat);
      } else if (
        slug.includes('rice') ||
        slug.includes('atta') ||
        slug.includes('grain') ||
        slug.includes('oil') ||
        slug.includes('spice') ||
        slug.includes('masala') ||
        slug.includes('dry-fruit') ||
        slug.includes('sauce')
      ) {
        staples.push(cat);
      } else if (
        slug.includes('snack') ||
        slug.includes('beverage') ||
        slug.includes('drink') ||
        slug.includes('instant')
      ) {
        snacks.push(cat);
      } else {
        home.push(cat);
      }
    });

    return {
      popularList: popular.length > 0 ? popular : topLevelCategories.slice(0, 4),
      staplesList: staples.length > 0 ? staples : topLevelCategories.slice(4, 8),
      snacksList: snacks.length > 0 ? snacks : topLevelCategories.slice(8, 12),
      homeList: home.length > 0 ? home : topLevelCategories.slice(12),
    };
  }, [topLevelCategories]);

  const handleCategoryPress = useCallback(
    (cat) => {
      if (!getCachedCategoryProducts(cat.id)) {
        apiClient
          .get('/products', { params: { categoryId: cat.id, limit: 30 }, __skipErrorToast: true })
          .then((res) => {
            const prods = res.data?.items || [];
            if (prods.length > 0) {
              setCachedCategoryProducts(cat.id, prods);
              const imgUrls = prods
                .map((p) => p.imageUrl || p.image || p.images?.[0])
                .filter((url) => typeof url === 'string' && url.startsWith('http'));
              if (imgUrls.length > 0) Image.prefetch(imgUrls);
            }
          })
          .catch(() => {});
      }
      navigation.navigate('Category', {
        id: cat.id,
        name: cat.name,
        image: cat.image,
        allCategories,
      });
    },
    [navigation, allCategories]
  );

  const renderCategoryGrid = (items) => (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        columnGap: colGap,
        rowGap: 16,
      }}
    >
      {items.map((cat) => {
        const visualSource = getCategoryVisual(cat, 120);
        return (
          <Pressable
            key={cat.id}
            onPress={() => handleCategoryPress(cat)}
            style={{ width: cardWidth, alignItems: 'center' }}
          >
            <View
              style={{
                width: cardWidth,
                height: cardWidth,
                borderRadius: 18,
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
            >
              {visualSource ? (
                <Image
                  source={visualSource}
                  style={{ width: '100%', height: '100%', borderRadius: 14 }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <ShoppingBag size={24} color="#94a3b8" />
              )}
            </View>
            <Text
              numberOfLines={2}
              style={{
                fontFamily: 'Inter-Bold',
                fontSize: 11.5,
                fontWeight: 'normal',
                color: '#0f172a',
                marginTop: 6,
                textAlign: 'center',
                lineHeight: 14,
              }}
            >
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header: Bold Categories title + Search Icon */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: paddingH,
          paddingTop: 12,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter-ExtraBold',
            fontSize: 26,
            fontWeight: 'normal',
            color: '#0f172a',
            letterSpacing: -0.5,
          }}
        >
          Categories
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={22} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: paddingH, paddingTop: 16, paddingBottom: 40 }}
      >
        {loading ? (
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: 'row', columnGap: colGap }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width={cardWidth} height={cardWidth} borderRadius={18} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', columnGap: colGap }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} width={cardWidth} height={cardWidth} borderRadius={18} />
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* TOP ROW / POPULAR CATEGORIES */}
            {popularList.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                {renderCategoryGrid(popularList)}
              </View>
            )}

            {/* SECTION 1: Staples & Cooking Essentials */}
            {staplesList.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: '#e6f4ea',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Utensils size={16} color="#059669" strokeWidth={2.2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'Inter-ExtraBold',
                      fontSize: 18,
                      fontWeight: 'normal',
                      color: '#0f172a',
                      letterSpacing: -0.3,
                    }}
                  >
                    Staples & Cooking Essentials
                  </Text>
                </View>
                {renderCategoryGrid(staplesList)}
              </View>
            )}

            {/* SECTION 2: Snacks & Drinks */}
            {snacksList.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: '#e6f4ea',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Coffee size={16} color="#059669" strokeWidth={2.2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'Inter-ExtraBold',
                      fontSize: 18,
                      fontWeight: 'normal',
                      color: '#0f172a',
                      letterSpacing: -0.3,
                    }}
                  >
                    Snacks & Drinks
                  </Text>
                </View>
                {renderCategoryGrid(snacksList)}
              </View>
            )}

            {/* SECTION 3: Home & Personal Care */}
            {homeList.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: '#e6f4ea',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Sparkles size={16} color="#059669" strokeWidth={2.2} />
                  </View>
                  <Text
                    style={{
                      fontFamily: 'Inter-ExtraBold',
                      fontSize: 18,
                      fontWeight: 'normal',
                      color: '#0f172a',
                      letterSpacing: -0.3,
                    }}
                  >
                    Home & Personal Care
                  </Text>
                </View>
                {renderCategoryGrid(homeList)}
              </View>
            )}

            {/* SECTION 4: All Store Categories */}
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: '#ecfdf5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Layers size={16} color="#047857" strokeWidth={2.2} />
                </View>
                <Text
                  style={{
                    fontFamily: 'Inter-ExtraBold',
                    fontSize: 18,
                    fontWeight: 'normal',
                    color: '#0f172a',
                    letterSpacing: -0.3,
                  }}
                >
                  All Categories ({topLevelCategories.length})
                </Text>
              </View>
              {renderCategoryGrid(topLevelCategories)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
