import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronDown,
  ChevronRight,
  Search,
  User,
  ShoppingBag,
  Truck,
  Plus,
  Minus,
  Tag,
  LayoutGrid,
  Bell,
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import apiClient from '../services/api';
import BrandBadge from '../components/BrandBadge';
import { Skeleton } from '../components/ui';
import MSClubModal from '../components/MSClubModal';
import { fonts } from '../theme/typography';
import { isProductUnavailable } from '../utils/productAvailability';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { getProductImageSource } from '../utils/productImages';
import { getCategoryVisual } from '../utils/categoryImages';
import slugify from '../utils/slugify';

const CANONICAL_CATEGORY_ORDER = {
  'fresh-vegetables': 1,
  'fresh': 1,
  'fresh-fruits': 1,
  'rice-atta-grains': 2,
  'staples': 2,
  'dairy': 3,
  'dairy-bread-eggs': 3,
  'snacks-confectionery': 4,
  'snacks': 4,
  'household-cleaning': 5,
  'home': 5,
  'cooking-oils-ghee': 6,
  'oils': 6,
  'spices-masala': 7,
  'spices': 7,
  'instant-ready-to-cook-mixes': 8,
  'instant': 8,
  'beverages': 9,
  'drinks': 9,
  'health-drinks': 10,
  'personal-care': 11,
  'bakery-items': 12,
  'pooja-devotional-items': 13,
  'dry-fruits-nuts': 14,
  'sauces-pickles-condiments': 15,
};

const getHomeScreenCategoryVisual = (cat) => {
  if (!cat) return null;
  if (cat.id === 'all') {
    return require('../../assets/categories/home/fresh-fruits.webp');
  }
  const slug = slugify(cat.name || cat.label || '');
  const bundled = {
    'fresh-vegetables': require('../../assets/categories/home/fresh-vegetables.webp'),
    'fresh': require('../../assets/categories/home/fresh-vegetables.webp'),
    'rice-atta-grains': require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp'),
    'staples': require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp'),
    'dairy': require('../../assets/categories/home/dairy-bread-eggs.webp'),
    'dairy-bread-eggs': require('../../assets/categories/home/dairy-bread-eggs.webp'),
    'snacks-confectionery': require('../../assets/categories/home/chips-namkeens.webp'),
    'snacks': require('../../assets/categories/home/chips-namkeens.webp'),
    'household-cleaning': require('../../assets/categories/home/cleaning-essentials.webp'),
    'home': require('../../assets/categories/home/cleaning-essentials.webp'),
    'cooking-oils-ghee': require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp'),
    'oils': require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp'),
    'spices-masala': require('../../assets/Cleaned_Products/Turmeric Powder.webp'),
    'spices': require('../../assets/Cleaned_Products/Turmeric Powder.webp'),
    'instant-ready-to-cook-mixes': require('../../assets/categories/home/noodles-pasta.webp'),
    'instant': require('../../assets/categories/home/noodles-pasta.webp'),
    'beverages': require('../../assets/categories/Beverages.webp'),
    'drinks': require('../../assets/categories/Beverages.webp'),
  }[slug];

  if (bundled) return bundled;
  return getCategoryVisual(cat, 100);
};

const getCategoryShortLabel = (cat) => {
  if (cat.id === 'all') return 'All';
  const name = (cat.name || cat.label || '').trim();
  const slug = slugify(name);
  const map = {
    'fresh-vegetables': 'Fresh',
    'fresh': 'Fresh',
    'fresh-fruits': 'Fruits',
    'rice-atta-grains': 'Staples',
    'staples': 'Staples',
    'dairy': 'Dairy',
    'dairy-bread-eggs': 'Dairy',
    'snacks-confectionery': 'Snacks',
    'snacks': 'Snacks',
    'household-cleaning': 'Home',
    'home': 'Home',
    'cooking-oils-ghee': 'Oils',
    'oils': 'Oils',
    'spices-masala': 'Spices',
    'spices': 'Spices',
    'instant-ready-to-cook-mixes': 'Instant',
    'instant': 'Instant',
    'beverages': 'Drinks',
    'drinks': 'Drinks',
    'health-drinks': 'Drinks',
    'personal-care': 'Personal',
    'bakery-items': 'Bakery',
    'pooja-devotional-items': 'Pooja',
    'dry-fruits-nuts': 'Dry Fruits',
    'sauces-pickles-condiments': 'Sauces',
  };
  return map[slug] || (name.length > 8 ? name.split(' ')[0] : name);
};

const ROTATING_SEARCH_TERMS = [
  '"sunflower oil"',
  '"toor dal"',
  '"milk"',
  '"fresh tomato"',
  '"atta"',
];

export default function HomeScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const { items: cartItems, addItem, updateQty, getQty, subtotal } = useCart();
  const { userProfile } = useContext(AuthContext);
  const { unreadCount } = useNotifications();

  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryProductsMap, setCategoryProductsMap] = useState({});
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [searchIndex, setSearchIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [showClubModal, setShowClubModal] = useState(false);

  const bannerScrollRef = useRef(null);
  const bannerIndexRef = useRef(0);
  const isDraggingBannerRef = useRef(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    bannerIndexRef.current = activeBannerIndex;
  }, [activeBannerIndex]);

  // Automatic & continuous hero banner slideshow
  useEffect(() => {
    if (!isFocused) return;

    const bannerTimer = setInterval(() => {
      if (isDraggingBannerRef.current) return;
      const nextIndex = (bannerIndexRef.current + 1) % 3;
      bannerIndexRef.current = nextIndex;
      setActiveBannerIndex(nextIndex);
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * (bannerCardWidth + 14),
        animated: true,
      });
    }, 3500);

    return () => clearInterval(bannerTimer);
  }, [bannerCardWidth, isFocused]);

  // Rotating search term
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchIndex((prev) => (prev + 1) % ROTATING_SEARCH_TERMS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Fetch products, categories, and default address
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        apiClient.get('/products', {
          params: { limit: 40 },
          __skipErrorToast: true,
        }),
        apiClient.get('/categories', { __skipErrorToast: true }),
      ]);

      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data?.items || []);
      }
      if (catRes.status === 'fulfilled') {
        setAllCategories(catRes.value.data?.items || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived dynamic category list driven completely by admin-portal / backend
  const homeCategories = useMemo(() => {
    const topLevel = allCategories
      .filter((c) => !c.parentId && c.isActive !== false);

    topLevel.sort((a, b) => {
      const orderA = a.order != null ? Number(a.order) : (CANONICAL_CATEGORY_ORDER[slugify(a.name || '')] ?? 999);
      const orderB = b.order != null ? Number(b.order) : (CANONICAL_CATEGORY_ORDER[slugify(b.name || '')] ?? 999);
      return orderA - orderB;
    });

    const allItem = {
      id: 'all',
      name: 'All',
      image: require('../../assets/categories/home/fresh-fruits.webp'),
    };

    return [allItem, ...topLevel];
  }, [allCategories]);

  // Grid categories for "Shop by category" driven by admin categories
  const shopByCategories = useMemo(() => {
    const topLevel = allCategories
      .filter((c) => !c.parentId && c.isActive !== false);

    topLevel.sort((a, b) => {
      const orderA = a.order != null ? Number(a.order) : (CANONICAL_CATEGORY_ORDER[slugify(a.name || '')] ?? 999);
      const orderB = b.order != null ? Number(b.order) : (CANONICAL_CATEGORY_ORDER[slugify(b.name || '')] ?? 999);
      return orderA - orderB;
    });

    return topLevel;
  }, [allCategories]);

  // Fetch category-specific products dynamically from backend when category pill is selected
  useEffect(() => {
    if (activeCategory === 'all') return;
    if (categoryProductsMap[activeCategory]) return;

    let isCancelled = false;
    setLoadingCategoryProducts(true);
    const fetchCategoryProducts = async () => {
      try {
        const items = [];
        let cursor = null;
        do {
          const { data } = await apiClient.get('/products', {
            params: { categoryId: activeCategory, limit: 50, ...(cursor ? { cursor } : {}) },
            __skipErrorToast: true,
          });
          items.push(...(data?.items || []));
          cursor = data?.cursor || null;
        } while (cursor && !isCancelled);
        if (!isCancelled) {
          setCategoryProductsMap((prev) => ({ ...prev, [activeCategory]: items }));
        }
      } catch {
        // Keep the products already loaded on Home when the category request fails.
      } finally {
        if (!isCancelled) setLoadingCategoryProducts(false);
      }
    };
    fetchCategoryProducts();

    return () => {
      isCancelled = true;
    };
  }, [activeCategory, categoryProductsMap]);

  // Fetch address
  useEffect(() => {
    if (!userProfile?.id) return;
    apiClient
      .get(`/users/${userProfile.id}/addresses`, { __skipErrorToast: true })
      .then(({ data }) => {
        const addrs = data.items || [];
        const def = addrs.find((a) => a.isDefault) || addrs[0] || null;
        setDefaultAddress(def);
      })
      .catch(() => {});
  }, [userProfile?.id]);

  const addressLabel = defaultAddress?.label || 'Home';
  const addressSubtitle = defaultAddress
    ? [defaultAddress.houseNo, defaultAddress.street, defaultAddress.landmark]
        .filter(Boolean)
        .join(', ') || 'Your delivery address'
    : 'Your delivery address';

  // Filter products by selected admin category (including any child subcategories)
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return products;

    const targetCategoryIds = new Set([activeCategory]);
    const categoryQueue = [activeCategory];
    for (let index = 0; index < categoryQueue.length; index += 1) {
      const parentId = categoryQueue[index];
      allCategories
        .filter((category) => category.parentId === parentId)
        .forEach((category) => {
          if (!targetCategoryIds.has(category.id)) {
            targetCategoryIds.add(category.id);
            categoryQueue.push(category.id);
          }
        });
    }
    return products.filter((product) => targetCategoryIds.has(product.categoryId));
  }, [products, activeCategory, allCategories]);

  const displayProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    if (categoryProductsMap[activeCategory] && categoryProductsMap[activeCategory].length > 0) {
      return categoryProductsMap[activeCategory];
    }
    return filteredProducts;
  }, [activeCategory, products, categoryProductsMap, filteredProducts]);

  const bestPriceProducts = useMemo(() => products.flatMap((product) =>
    (product.variants || []).flatMap((variant) => {
      const mrp = Number(variant.price ?? variant.mrp ?? 0);
      const price = Number(variant.offerPrice ?? variant.sellingPrice ?? mrp);
      if (!(mrp > 0 && price > 0 && price < mrp) || isProductUnavailable(product, variant)) return [];
      return [{
        id: `${product.id}-${variant.id}`,
        product,
        variant,
        name: product.name,
        packSize: variant.label || product.unit || '1 item',
        price,
        mrp,
        discount: Math.round(((mrp - price) / mrp) * 100),
      }];
    })
  ).sort((a, b) => b.discount - a.discount).slice(0, 8), [products]);

  const cartItemCount = cartItems.reduce((sum, item) => sum + (item.qty || 1), 0);
  const firstCartItem = cartItems[0];
  const firstCartItemImage = firstCartItem
    ? getProductImageSource(firstCartItem, 100) || (firstCartItem.image ? { uri: optimizeCloudinaryUrl(firstCartItem.image, 100) } : null)
    : null;

  // Free delivery calculation
  const freeDeliveryThreshold = 200;
  const missingForFree = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeProgress = Math.min(1, subtotal / freeDeliveryThreshold);

  const bannerCardWidth = screenWidth - 32;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', position: 'relative' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP SECTION: Header, Search Bar, and Sub-categories */}
      <View style={{ backgroundColor: '#ffffff', paddingBottom: 0 }}>
        {/* Header Row: [ms logo] [Delivery in 18 mins ⌵] [Profile Avatar] */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 6,
          }}
        >
          {/* Left Brand Badge + Delivery Address Dropdown */}
          <Pressable
            onPress={() => navigation.navigate('LocationPrompt')}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}
          >
            {/* MS Traders App Logo */}
            <View style={{ marginRight: 10 }}><BrandBadge size={40} /></View>

            {/* Delivery in 18 mins & Address */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#059669',
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'Inter-Medium',
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#475569',
                  }}
                >
                  MS Traders · delivery in
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                <Text
                  style={{
                    fontFamily: 'Inter-ExtraBold',
                    fontSize: 22,
                    fontWeight: 'normal',
                    color: '#0f172a',
                    letterSpacing: -0.4,
                  }}
                >
                  18 mins
                </Text>
                <ChevronDown size={17} color="#0f172a" strokeWidth={3} style={{ marginLeft: 4 }} />
              </View>

              <Text
                numberOfLines={1}
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 12,
                  fontWeight: 'normal',
                  color: '#64748b',
                  marginTop: 1,
                }}
              >
                {addressLabel} · [{addressSubtitle}]
              </Text>
            </View>
          </Pressable>

          {/* Notifications sit immediately left of the profile button. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#dce4dd',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={19} color="#0f172a" strokeWidth={2.1} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 4,
                    borderRadius: 9,
                    backgroundColor: '#dc2626',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#ffffff',
                  }}
                >
                  <Text style={{ fontFamily: 'Inter-Bold', fontSize: 9, color: '#ffffff', lineHeight: 11 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Account')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Profile"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#dce4dd',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {userProfile?.profileImage ? (
                <Image
                  source={{ uri: optimizeCloudinaryUrl(userProfile.profileImage, 100) }}
                  style={{ width: '100%', height: '100%', borderRadius: 22 }}
                  contentFit="cover"
                />
              ) : (
                <User size={20} color="#0f172a" strokeWidth={2.2} />
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Search Bar matching Images 1, 2, 3 */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={{ paddingHorizontal: 16, marginTop: 10 }}>
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 12,
              height: 46,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#dce4dd',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.02,
              shadowRadius: 3,
              elevation: 0,
            }}
          >
            <Search size={18} color="#64748b" strokeWidth={2.2} />
            <View style={{ flex: 1, marginLeft: 10, height: 22, justifyContent: 'center', overflow: 'hidden' }}>
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 14,
                  fontWeight: 'normal',
                  color: '#64748b',
                }}
              >
                Search {ROTATING_SEARCH_TERMS[searchIndex]}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {/* BODY CONTENT SCROLLVIEW */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        decelerationRate="normal"
        overScrollMode="never"
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        style={{ flex: 1, backgroundColor: '#ffffff' }}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: cartItemCount > 0 ? 90 : 32,
        }}
      >
        {/* Sub-category Pills matching Images 1, 2, 3 */}
        <View style={{ marginBottom: 14 }}>
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          >
            {loading && allCategories.length === 0 ? (
              Array.from({ length: 6 }, (_, index) => (
                <View key={`home-category-skeleton-${index}`} style={{ alignItems: 'center', width: 52 }}>
                  <Skeleton width={48} height={48} borderRadius={24} />
                  <Skeleton width={42} height={10} borderRadius={4} className="mt-2" />
                </View>
              ))
            ) : homeCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const imgSource = getHomeScreenCategoryVisual(cat);
              const categoryLabel = getCategoryShortLabel(cat);

              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    if (cat.id === 'all') {
                      setActiveCategory('all');
                    } else {
                      navigation.navigate('Category', {
                        id: cat.id,
                        name: cat.name || cat.label,
                        image: cat.image,
                      });
                    }
                  }}
                  style={{ alignItems: 'center', minWidth: 52, maxWidth: 64, paddingHorizontal: 2 }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#ffffff',
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive ? '#087f46' : '#dce4dd',
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    {imgSource ? (
                      <Image
                        source={imgSource}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <ShoppingBag size={22} color="#94a3b8" />
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: isActive ? 'Inter-Bold' : 'Inter-Medium',
                      fontSize: 12,
                      fontWeight: 'normal',
                      color: isActive ? '#087f46' : '#475569',
                      marginTop: 6,
                      textAlign: 'center',
                    }}
                  >
                    {categoryLabel}
                  </Text>
                  {/* Active Green Underline Bar matching Images 1, 2, 3 */}
                  <View
                    style={{
                      width: 24,
                      height: 3,
                      backgroundColor: isActive ? '#087f46' : 'transparent',
                      borderRadius: 1.5,
                      marginTop: 4,
                    }}
                  />
                </Pressable>
              );
            })}
      </ScrollView>
        </View>

        {/* HERO BANNER CAROUSEL matching Reference Images */}
        <View style={{ marginBottom: 14 }}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            nestedScrollEnabled={true}
            overScrollMode="never"
            pagingEnabled={false}
            snapToInterval={bannerCardWidth + 14}
            decelerationRate="fast"
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              isDraggingBannerRef.current = true;
            }}
            onScrollEndDrag={() => {
              isDraggingBannerRef.current = false;
            }}
            onMomentumScrollEnd={(e) => {
              isDraggingBannerRef.current = false;
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.min(2, Math.max(0, Math.round(x / (bannerCardWidth + 14))));
              bannerIndexRef.current = idx;
              setActiveBannerIndex(idx);
            }}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.min(2, Math.max(0, Math.round(x / (bannerCardWidth + 14))));
              if (idx !== activeBannerIndex) {
                setActiveBannerIndex(idx);
                bannerIndexRef.current = idx;
              }
            }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
          >
            {/* Banner 1: Farm Fresh (Light Fresh Sage Green) */}
            <View
              style={{
                width: bannerCardWidth,
                height: 166,
                borderRadius: 22,
                backgroundColor: '#E4F2E9',
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 10.5,
                    fontWeight: 'normal',
                    color: '#1C2E24',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 3,
                  }}
                >
                  FARM FRESH
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-ExtraBold',
                    fontSize: 18,
                    fontWeight: 'normal',
                    color: '#111813',
                    lineHeight: 22.5,
                    letterSpacing: -0.4,
                  }}
                >
                  Vegetables picked{'\n'}this morning
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-Regular',
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#3B5145',
                    marginTop: 3,
                    marginBottom: 11,
                  }}
                >
                  Starting at just ₹9
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('Main', { screen: 'Categories' })}
                  hitSlop={8}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <View
                    style={{
                      backgroundColor: '#0A7C47',
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 6.5,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter-Bold',
                        fontSize: 12.5,
                        fontWeight: 'normal',
                        color: '#ffffff',
                        marginRight: 4,
                      }}
                    >
                      Shop now
                    </Text>
                    <ChevronRight size={13} color="#ffffff" strokeWidth={2.8} />
                  </View>
                </Pressable>
              </View>

              {/* Graphic collage with fresh vegetables */}
              <View
                style={{
                  width: 122,
                  height: 74,
                  borderRadius: 16,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('../../assets/images/banner_collage_fresh.webp')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Banner 2: Monthly Ration (Solid Vibrant Emerald Green) */}
            <View
              style={{
                width: bannerCardWidth,
                height: 166,
                borderRadius: 22,
                backgroundColor: '#0B7B43',
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 10.5,
                    fontWeight: 'normal',
                    color: '#A7F3D0',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 3,
                  }}
                >
                  MONTHLY RATION
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-ExtraBold',
                    fontSize: 18,
                    fontWeight: 'normal',
                    color: '#ffffff',
                    lineHeight: 22.5,
                    letterSpacing: -0.4,
                  }}
                >
                  Wholesale prices,{'\n'}home delivered
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-Regular',
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#D1FAE5',
                    marginTop: 3,
                    marginBottom: 11,
                  }}
                >
                  Up to 20% off atta, rice & oil
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('Offers')}
                  hitSlop={8}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <View
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 6.5,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter-Bold',
                        fontSize: 12.5,
                        fontWeight: 'normal',
                        color: '#0B7B43',
                        marginRight: 4,
                      }}
                    >
                      Shop now
                    </Text>
                    <ChevronRight size={13} color="#0B7B43" strokeWidth={2.8} />
                  </View>
                </Pressable>
              </View>

              {/* Graphic collage with staple items matching Reference Image 2 */}
              <View
                style={{
                  width: 140,
                  height: 86,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('../../assets/images/banner_collage_ration.webp')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Banner 3: Tea Time (Deep Charcoal Forest Green) */}
            <View
              style={{
                width: bannerCardWidth,
                height: 166,
                borderRadius: 22,
                backgroundColor: '#1E2B23',
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'hidden',
              }}
            >
              <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 10.5,
                    fontWeight: 'normal',
                    color: '#94A3B8',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 3,
                  }}
                >
                  TEA TIME
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-ExtraBold',
                    fontSize: 18,
                    fontWeight: 'normal',
                    color: '#ffffff',
                    lineHeight: 22.5,
                    letterSpacing: -0.4,
                  }}
                >
                  Tea, biscuits &{'\n'}snacks
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-Regular',
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#CBD5E1',
                    marginTop: 3,
                    marginBottom: 11,
                  }}
                >
                  Buy 2, get 10% extra off
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('Main', { screen: 'Categories' })}
                  hitSlop={8}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <View
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 6.5,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter-Bold',
                        fontSize: 12.5,
                        fontWeight: 'normal',
                        color: '#1E2B23',
                        marginRight: 4,
                      }}
                    >
                      Shop now
                    </Text>
                    <ChevronRight size={13} color="#1E2B23" strokeWidth={2.8} />
                  </View>
                </Pressable>
              </View>

              {/* Graphic collage with tea and snacks */}
              <View
                style={{
                  width: 122,
                  height: 74,
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 3,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={require('../../assets/images/banner_collage_teatime.webp')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
            </View>
          </ScrollView>

          {/* Dots Indicator matching Images 1, 2, 3 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 6 }}>
            {[0, 1, 2].map((i) => {
              const isActive = activeBannerIndex === i;
              return (
                <Pressable
                  key={i}
                  hitSlop={8}
                  onPress={() => {
                    bannerIndexRef.current = i;
                    setActiveBannerIndex(i);
                    bannerScrollRef.current?.scrollTo({
                      x: i * (bannerCardWidth + 14),
                      animated: true,
                    });
                  }}
                  style={{
                    width: isActive ? 20 : 5.5,
                    height: 5.5,
                    borderRadius: 3,
                    backgroundColor: isActive ? '#121712' : '#C4CCC5',
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* FREE DELIVERY PROGRESS CARD matching Images 1, 2, 3 */}
        <View style={{ paddingHorizontal: 16, marginBottom: 18 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 14,
              padding: 13,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Truck size={18} color="#047857" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: '#334155' }}>
                {missingForFree > 0 ? (
                  <>
                    <Text style={{ fontFamily: 'Inter-Regular', fontWeight: 'normal', color: '#334155' }}>
                      Add{' '}
                    </Text>
                    <Text style={{ fontFamily: 'Inter-ExtraBold', fontWeight: 'normal', color: '#0f172a' }}>
                      ₹{missingForFree}
                    </Text>
                    <Text style={{ fontFamily: 'Inter-Regular', fontWeight: 'normal', color: '#334155' }}>
                      {' '}more for{' '}
                    </Text>
                    <Text style={{ fontFamily: 'Inter-Bold', fontWeight: 'normal', color: '#047857' }}>
                      free delivery
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontFamily: 'Inter-Bold', fontWeight: 'normal', color: '#047857' }}>
                    Free delivery applied to your order!
                  </Text>
                )}
              </Text>
            </View>

            {/* Green Progress Track */}
            <View style={{ height: 5, backgroundColor: '#e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.round(freeProgress * 100)}%`,
                  height: '100%',
                  backgroundColor: '#047857',
                  borderRadius: 2.5,
                }}
              />
            </View>
          </View>
        </View>

        {/* DAILY ESSENTIALS SECTION matching Images 1, 2, 3 */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            {/* Header: [Bag icon] Daily essentials  See all > */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    backgroundColor: '#ecfdf5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <ShoppingBag size={18} color="#047857" strokeWidth={2.2} />
                </View>
                <View>
                  <Text
                    style={{
                      fontFamily: 'Inter-ExtraBold',
                      fontSize: 18,
                      fontWeight: 'normal',
                      color: '#0f172a',
                      letterSpacing: -0.3,
                    }}
                  >
                    {activeCategory === 'all'
                      ? 'Daily essentials'
                      : (allCategories.find((c) => c.id === activeCategory)?.name || 'Category items')}
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
                    {activeCategory === 'all'
                      ? 'Most ordered in your area'
                      : `${displayProducts.length} items available`}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (activeCategory === 'all') {
                    navigation.navigate('Main', { screen: 'Categories' });
                  } else {
                    const selected = allCategories.find((c) => c.id === activeCategory);
                    navigation.navigate('Category', {
                      id: activeCategory,
                      name: selected?.name || 'Category',
                      image: selected?.image,
                    });
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter-Bold',
                    fontSize: 13.5,
                    fontWeight: 'normal',
                    color: '#047857',
                    marginRight: 3,
                  }}
                >
                  See all
                </Text>
                <ChevronRight size={15} color="#047857" strokeWidth={2.6} />
              </Pressable>
            </View>

            {/* Vertical Items List matching Images 1, 2, 3 */}
            {loading || (loadingCategoryProducts && activeCategory !== 'all') ? (
              <View style={{ gap: 14 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} width="100%" height={70} borderRadius={16} />
                ))}
              </View>
            ) : displayProducts.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    fontSize: 13.5,
                    color: '#64748b',
                    textAlign: 'center',
                  }}
                >
                  No products found in this category yet.
                </Text>
              </View>
            ) : (
              displayProducts.slice(0, 12).map((prod) => {
                const variant = prod.variants?.[0];
                const price = variant?.offerPrice ?? variant?.price ?? prod.price ?? 0;
                const mrp = variant?.price ?? prod.price ?? 0;
                const packSize = variant?.label || prod.unit || '500 g';
                const qty = getQty(prod.id, variant?.id);
                const outOfStock = isProductUnavailable(prod, variant);
                const imgSource =
                  getProductImageSource(prod, 150) || (prod.image ? { uri: optimizeCloudinaryUrl(prod.image, 150) } : null);

                return (
                  <View
                    key={prod.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderColor: '#f8fafc',
                    }}
                  >
                    {/* Thumbnail */}
                    <Pressable
                      onPress={() => navigation.navigate('ProductDetail', { id: prod.id })}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 14,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      {imgSource ? (
                        <Image
                          source={imgSource}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                        />
                      ) : (
                        <ShoppingBag size={24} color="#94a3b8" />
                      )}
                    </Pressable>

                    {/* Info */}
                    <Pressable
                      onPress={() => navigation.navigate('ProductDetail', { id: prod.id })}
                      style={{ flex: 1, paddingRight: 8 }}
                    >
                      <Text
                        numberOfLines={2}
                        style={{
                          fontFamily: 'Inter-Bold',
                          fontSize: 15,
                          fontWeight: 'normal',
                          color: '#0f172a',
                          lineHeight: 20,
                        }}
                      >
                        {prod.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter-Regular',
                          fontSize: 13,
                          fontWeight: 'normal',
                          color: '#64748b',
                          marginTop: 2,
                        }}
                      >
                        {packSize}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
                        <Text
                          style={{
                            fontFamily: 'Inter-ExtraBold',
                            fontSize: 16,
                            fontWeight: 'normal',
                            color: '#0f172a',
                          }}
                        >
                          ₹{price}
                        </Text>
                        {mrp > price && (
                          <Text
                            style={{
                              fontFamily: 'Inter-Regular',
                              fontSize: 12.5,
                              fontWeight: 'normal',
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

                    {/* ADD Button or Stepper matching Images 1, 2, 3 */}
                    {outOfStock ? (
                      <View
                        style={{
                          borderWidth: 1.2,
                          borderColor: '#ef4444',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          backgroundColor: '#fff',
                        }}
                      >
                        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11.5, color: '#ef4444' }}>SOLD OUT</Text>
                      </View>
                    ) : qty === 0 ? (
                      <Pressable
                        onPress={() => addItem(prod, variant)}
                        style={{
                          borderWidth: 1.2,
                          borderColor: '#047857',
                          borderRadius: 8,
                          paddingHorizontal: 22,
                          paddingVertical: 7,
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter-Bold',
                            fontSize: 13.5,
                            fontWeight: 'normal',
                            color: '#047857',
                          }}
                        >
                          ADD
                        </Text>
                      </Pressable>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#047857',
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          height: 34,
                        }}
                      >
                        <Pressable
                          onPress={() => updateQty(prod.id, variant?.id, -1)}
                          hitSlop={6}
                          style={{ paddingHorizontal: 6 }}
                        >
                          <Minus size={14} color="#ffffff" strokeWidth={3} />
                        </Pressable>
                        <Text
                          style={{
                            fontFamily: 'Inter-Bold',
                            fontSize: 13.5,
                            fontWeight: 'normal',
                            color: '#ffffff',
                            marginHorizontal: 6,
                          }}
                        >
                          {qty}
                        </Text>
                        <Pressable
                          onPress={() => addItem(prod, variant)}
                          hitSlop={6}
                          style={{ paddingHorizontal: 6 }}
                        >
                          <Plus size={14} color="#ffffff" strokeWidth={3} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* TODAY'S BEST PRICES SECTION matching Image 4 */}
        <View style={{ marginTop: 22 }}>
          {/* Section Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 9,
                }}
              >
                <Tag size={16} color="#d97706" strokeWidth={2.2} />
              </View>
              <View>
                <Text
                  style={{
                    fontFamily: 'Inter-ExtraBold',
                    fontSize: 18,
                    fontWeight: 'normal',
                    color: '#0f172a',
                    letterSpacing: -0.3,
                  }}
                >
                  Today&apos;s best prices
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter-Regular',
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#64748b',
                    marginTop: 1,
                  }}
                >
                  Trader rates on staples
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => navigation.navigate('Main', { screen: 'Offers' })}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 13,
                  fontWeight: 'normal',
                  color: '#047857',
                  marginRight: 2,
                }}
              >
                See all
              </Text>
              <ChevronRight size={15} color="#047857" strokeWidth={2.6} />
            </Pressable>
          </View>

          {/* Horizontal Product Cards Carousel matching Image 4 */}
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          >
            {bestPriceProducts.map((item) => {
              const qty = getQty(item.product.id, item.variant.id);

              return (
                <View
                  key={item.id}
                  style={{
                    width: 154,
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    position: 'relative',
                  }}
                >
                  {/* Discount is calculated only from this saved variant's MRP and offer price. */}
                  {item.discount > 0 && <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 3,
                      backgroundColor: '#f59e0b',
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter-ExtraBold',
                        fontSize: 10,
                        fontWeight: 'normal',
                        color: '#0f172a',
                        textAlign: 'center',
                        lineHeight: 12,
                      }}
                    >
                      {item.discount}{'\n'}OFF
                    </Text>
                  </View>}

                  {/* Product Image */}
                  <View style={{ width: '100%', height: 104, alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={getProductImageSource(item.product, 200)}
                      style={{ width: '80%', height: '80%' }}
                      contentFit="contain"
                    />
                  </View>

                  {/* Pack Size */}
                  <Text
                    style={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 12,
                      fontWeight: 'normal',
                      color: '#64748b',
                      marginTop: 6,
                    }}
                  >
                    {item.packSize}
                  </Text>

                  {/* Product Name */}
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: 'Inter-Bold',
                      fontSize: 13,
                      fontWeight: 'normal',
                      color: '#0f172a',
                      marginTop: 2,
                    }}
                  >
                    {item.name}
                  </Text>

                  {/* Price & Action row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 8,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontFamily: 'Inter-ExtraBold',
                          fontSize: 16,
                          fontWeight: 'normal',
                          color: '#0f172a',
                        }}
                      >
                        ₹{item.price}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter-Regular',
                          fontSize: 11.5,
                          fontWeight: 'normal',
                          color: '#94a3b8',
                          textDecorationLine: 'line-through',
                        }}
                      >
                        ₹{item.mrp}
                      </Text>
                    </View>

                    {qty === 0 ? (
                      <Pressable
                        onPress={() => addItem(item.product, item.variant)}
                        style={{
                          borderWidth: 1.2,
                          borderColor: '#047857',
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Inter-Bold',
                            fontSize: 12.5,
                            fontWeight: 'normal',
                            color: '#047857',
                          }}
                        >
                          ADD
                        </Text>
                      </Pressable>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#047857',
                          borderRadius: 8,
                          paddingHorizontal: 5,
                          height: 30,
                        }}
                      >
                        <Pressable
                          onPress={() => updateQty(item.product.id, item.variant.id, -1)}
                          hitSlop={6}
                          style={{ paddingHorizontal: 5 }}
                        >
                          <Minus size={12} color="#ffffff" strokeWidth={3} />
                        </Pressable>
                        <Text
                          style={{
                            fontFamily: 'Inter-Bold',
                            fontSize: 12.5,
                            fontWeight: 'normal',
                            color: '#ffffff',
                            marginHorizontal: 4,
                          }}
                        >
                          {qty}
                        </Text>
                        <Pressable
                          onPress={() => addItem(item.product, item.variant)}
                          hitSlop={6}
                          style={{ paddingHorizontal: 5 }}
                        >
                          <Plus size={12} color="#ffffff" strokeWidth={3} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* SHOP BY CATEGORY SECTION matching Image 4 & Image 5 */}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          {/* Section Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#ecfdf5',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 9,
              }}
            >
              <LayoutGrid size={16} color="#047857" strokeWidth={2.2} />
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
              Shop by category
            </Text>
          </View>

          {/* 4-Column Grid matching Image 5 */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              columnGap: 10,
              rowGap: 16,
            }}
          >
            {loading && allCategories.length === 0 ? (
              Array.from({ length: 8 }, (_, index) => {
                const cardW = Math.floor((screenWidth - 32 - 30) / 4);
                return (
                  <View key={`shop-category-skeleton-${index}`} style={{ width: cardW, alignItems: 'center' }}>
                    <Skeleton width={cardW} height={cardW} borderRadius={18} />
                    <Skeleton width="76%" height={12} borderRadius={4} className="mt-2" />
                  </View>
                );
              })
            ) : shopByCategories.map((cat) => {
              const cardW = Math.floor((screenWidth - 32 - 30) / 4);
              const visualSource = getHomeScreenCategoryVisual(cat);

              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    navigation.navigate('Category', {
                      id: cat.id,
                      name: cat.name,
                      image: cat.image,
                    });
                  }}
                  style={{ width: cardW, alignItems: 'center' }}
                >
                  <View
                    style={{
                      width: cardW,
                      height: cardW,
                      borderRadius: 18,
                      backgroundColor: '#ffffff',
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#f1f5f9',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {visualSource ? (
                      <Image
                        source={visualSource}
                        style={{ width: '100%', height: '100%', borderRadius: 18 }}
                        contentFit="cover"
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
        </View>
        {/* Keep the club card and brand footer together as the final home section. */}
        <Pressable
          onPress={() => setShowClubModal(true)}
          style={{
            marginTop: 24,
            marginHorizontal: 16,
            marginBottom: 34,
            backgroundColor: '#fff8ec',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#fed7aa',
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text
              style={{
                fontFamily: 'Inter-ExtraBold',
                fontSize: 16.5,
                fontWeight: 'normal',
                color: '#1c1917',
                letterSpacing: -0.3,
              }}
            >
              Join MS Club
            </Text>
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 12.5,
                fontWeight: 'normal',
                color: '#71717a',
                marginTop: 3,
                lineHeight: 18,
              }}
            >
              Free delivery on every order and{'\n'}extra 5% off bulk packs.
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#18181b',
              borderRadius: 12,
              paddingHorizontal: 15,
              paddingVertical: 9,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter-Bold',
                fontSize: 13,
                fontWeight: 'normal',
                color: '#ffffff',
              }}
            >
              Know more
            </Text>
          </View>
        </Pressable>

        <View style={{ marginHorizontal: 16, marginBottom: 12, alignItems: 'flex-start' }}>
          <Text
            accessibilityRole="text"
            style={{ fontFamily: 'Inter-ExtraBold', fontSize: 38, lineHeight: 44, color: '#cbd6ce', letterSpacing: -1.4 }}
          >
            ms traders
          </Text>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 17, color: '#647569' }}>
            Your neighbourhood trader, now on your phone
          </Text>
        </View>
      </ScrollView>

      {/* FLOATING "View cart" CAPSULE BAR matching Images 1, 2, 3 */}
      {cartItemCount > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 12,
            left: 14,
            right: 14,
            zIndex: 999,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('Cart')}
            style={{ width: '100%' }}
          >
            <View
              style={{
                backgroundColor: '#0a7942',
                borderRadius: 16,
                height: 56,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.22,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
            {/* First Cart item thumbnail */}
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                padding: 2,
              }}
            >
              {firstCartItemImage ? (
                <Image
                  source={firstCartItemImage}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              ) : (
                <ShoppingBag size={20} color="#0a7942" />
              )}
            </View>

            {/* Label and Item total */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter-Bold',
                  fontSize: 14.5,
                  fontWeight: 'normal',
                  color: '#ffffff',
                }}
              >
                View cart
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter-Medium',
                  fontSize: 12,
                  fontWeight: 'normal',
                  color: '#dcfce7',
                  marginTop: 1,
                }}
              >
                {cartItemCount} item{cartItemCount > 1 ? 's' : ''} · ₹{subtotal}
              </Text>
            </View>

            {/* Circle chevron button */}
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={18} color="#ffffff" strokeWidth={2.8} />
            </View>
          </View>
        </Pressable>
      </View>
      )}

      {/* MS Club Modal */}
      <MSClubModal visible={showClubModal} onClose={() => setShowClubModal(false)} />
    </SafeAreaView>
  );
}
