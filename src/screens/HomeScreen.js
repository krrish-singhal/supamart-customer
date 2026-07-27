import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, ScrollView, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ShoppingBag, Plus, Minus, Search, MapPin, ChevronRight, User, Bell, Star } from 'lucide-react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { collection, doc, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Skeleton, ProductCard } from '../components/ui';
import { useCart } from '../context/CartContext';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W - 32;

export default function HomeScreen({ navigation }) {
  const { items, addItem, updateQty, getQty } = useCart();
  const [config, setConfig] = useState(null);
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState(null);

  const FILTERS = ['Fastest Delivery', 'Great Offers', 'Organic', 'Price: Low to High', 'Filters'];

  const bannerRef = useRef(null);
  const autoplayRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    let unsubConfig, unsubBanners, unsubCats, unsubFeatured;

    try {
      unsubConfig = onSnapshot(doc(db, 'config', 'app'), (docSnap) => {
        if (docSnap.exists()) setConfig(docSnap.data());
      });

      unsubBanners = onSnapshot(collection(db, 'banners'), (snap) => {
        setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubCats = onSnapshot(query(collection(db, 'categories'), where('isActive', '==', true)), (snap) => {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.order || 0) - (b.order || 0)));
      });

      unsubFeatured = onSnapshot(
        query(collection(db, 'products'), where('isFeatured', '==', true), limit(10)),
        (snap) => {
          setFeatured(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      );

      // Fetch more products for the vertical list
      const unsubAll = onSnapshot(
        query(collection(db, 'products'), limit(100)),
        (snap) => {
          setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }
      );

      return () => {
        if (unsubConfig) unsubConfig();
        if (unsubBanners) unsubBanners();
        if (unsubCats) unsubCats();
        if (unsubFeatured) unsubFeatured();
        if (unsubAll) unsubAll();
      };
    } catch (e) {
      console.error(e);
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    autoplayRef.current = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollToOffset({ offset: next * (BANNER_W + 12), animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(autoplayRef.current);
  }, [banners.length]);

  if (loading) return <HomeSkeleton />;

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50 items-center justify-center" edges={['top']}>
        <Text className="text-text-secondary font-medium mb-4">Couldn't load store</Text>
        <Pressable onPress={() => setError(false)} className="bg-primary-600 px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(350)}
          className="flex-row items-center justify-between px-5 pt-4 pb-4"
        >
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ width: 100, height: 50 }} 
            contentFit="contain" 
          />
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            className="w-10 h-10 rounded-full bg-white border border-border-light shadow-soft items-center justify-center"
          >
            <Bell size={20} color="#0f172a" />
          </Pressable>
        </Animated.View>

        {/* Search */}
        <Animated.View entering={FadeInDown.duration(350).delay(60)} className="px-5 mb-5">
          <Pressable
            onPress={() => navigation.navigate('Search')}
            className="flex-row items-center bg-white border border-border rounded-2xl px-4 shadow-soft"
            style={{ height: 52 }}
          >
            <Search size={18} color="#94a3b8" />
            <Text className="ml-3 text-base font-medium text-text-tertiary flex-1">
              Search for groceries…
            </Text>
          </Pressable>
        </Animated.View>

        {/* Banner Carousel */}
        {banners.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(120)} className="mb-6">
            <FlatList
              ref={bannerRef}
              horizontal
              data={banners}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              pagingEnabled={false}
              snapToInterval={BANNER_W + 12}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16 }}
              onScrollBeginDrag={() => clearInterval(autoplayRef.current)}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + 12));
                setBannerIndex(Math.max(0, Math.min(idx, banners.length - 1)));
              }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => item.target && navigation.navigate('Category', { id: item.target })}
                  style={{ width: BANNER_W, marginRight: 12 }}
                  className="rounded-3xl overflow-hidden shadow-soft"
                >
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: '100%', height: 160 }}
                    contentFit="cover"
                    transition={200}
                  />
                </Pressable>
              )}
            />
            {banners.length > 1 && (
              <View className="flex-row justify-center mt-3" style={{ gap: 6 }}>
                {banners.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      height: 6,
                      width: i === bannerIndex ? 20 : 6,
                      borderRadius: 3,
                      backgroundColor: i === bannerIndex ? '#16a34a' : '#cbd5e1',
                    }}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Banner Carousel */}
        {categories.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(180)} className="mb-7">
            <View className="flex-row items-center justify-between px-5 mb-3">
              <Text className="text-lg font-black text-text-primary tracking-tight">
                Shop by Category
              </Text>
            </View>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              renderItem={({ item, index }) => (
                <CategoryCard
                  item={item}
                  index={index}
                  onPress={() => navigation.navigate('Category', { id: item.id, name: item.name })}
                />
              )}
            />
          </Animated.View>
        )}

        {/* Filters */}
        <Animated.View entering={FadeInDown.duration(350).delay(240)} className="mb-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {FILTERS.map(filter => {
              const isActive = activeFilter === filter;
              return (
                <Pressable 
                  key={filter}
                  onPress={() => setActiveFilter(isActive ? null : filter)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
                    backgroundColor: isActive ? '#059669' : '#fff',
                    borderWidth: 1, borderColor: '#059669',
                    flexDirection: 'row', alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#fff' : '#0f172a' }}>
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Popular Near You (Replacing old All Products / Featured) */}
        {allProducts.length > 0 && (() => {
          const filteredProducts = activeFilter 
            ? allProducts.filter(item => 
                item.name?.toLowerCase().includes(activeFilter.toLowerCase()) || 
                item.categoryName?.toLowerCase().includes(activeFilter.toLowerCase()) ||
                item.tags?.some(tag => tag.toLowerCase().includes(activeFilter.toLowerCase()))
              ) 
            : allProducts;

          return (
            <Animated.View entering={FadeInDown.duration(350).delay(300)} className="mt-6 px-4 pb-20">
              <Text className="text-lg font-black text-text-primary tracking-tight mb-4 ml-1">
                Popular Near You
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(item => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      style={{ width: '48%', marginBottom: 16 }}
                      onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                      qty={getQty(item.id, item.variants?.[0]?.id)}
                      onAdd={() => addItem(item, item.variants?.[0])}
                      onIncrement={() => addItem(item, item.variants?.[0])}
                      onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
                    />
                  ))
                ) : (
                  <Text className="text-sm text-text-secondary w-full text-center py-8">No products found for {activeFilter}</Text>
                )}
              </View>
            </Animated.View>
          );
        })()}

        {/* Floating Cart Bar (Removed, as Image 1 uses bottom tabs instead) */}
      </ScrollView>

      {/* Floating Cart Bar */}
      {items.length > 0 && (
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
              {items.reduce((sum, item) => sum + item.qty, 0)} Item{items.length > 1 ? 's' : ''}
            </Text>
            <View style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 10 }} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
              ₹{items.reduce((sum, item) => sum + (item.price * item.qty), 0)}
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
    </SafeAreaView>
  );
}

const CATEGORY_ICONS = {
  vegetables: ShoppingBag, fruits: ShoppingBag, dairy: ShoppingBag, snacks: ShoppingBag,
  beverages: ShoppingBag, groceries: ShoppingBag, household: ShoppingBag, frozen: ShoppingBag,
  bakery: ShoppingBag, meat: ShoppingBag, seafood: ShoppingBag, eggs: ShoppingBag,
  organic: ShoppingBag, personal: ShoppingBag,
};

const CATEGORY_GRADIENTS = [
  '#f0fdf4', '#f0fdf4', '#f0fdf4', '#f0fdf4',
  '#f0fdf4', '#f0fdf4', '#f0fdf4', '#f0fdf4',
];

function getCategoryIcon(item) {
  const key = item.name.toLowerCase().split(' ')[0];
  const IconComponent = CATEGORY_ICONS[key] || ShoppingBag;
  return <IconComponent size={34} color="#64748b" />;
}

function CategoryCard({ item, onPress, index }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const AnimPress = Animated.createAnimatedComponent(Pressable);
  const bg = CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length];

  return (
    <AnimPress
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.92, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 140 }); }}
      style={[animStyle, { width: 88 }]}
      className="items-center"
    >
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-2.5 overflow-hidden"
        style={{
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: '100%', borderRadius: 40 }}
            contentFit="cover"
          />
        ) : (
          getCategoryIcon(item)
        )}
      </View>
      <Text
        className="text-xs font-bold text-text-primary text-center leading-4"
        style={{ width: 80 }}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </AnimPress>
  );
}

function HomeSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between">
        <Skeleton width={130} height={22} borderRadius={8} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
      <View className="px-5 mb-5">
        <Skeleton width="100%" height={52} borderRadius={16} />
      </View>
      <View className="px-4 mb-6">
        <Skeleton width={BANNER_W} height={160} borderRadius={24} />
      </View>
      <View className="px-5 mb-3">
        <Skeleton width={160} height={22} borderRadius={8} />
      </View>
      <View className="flex-row px-4 mb-7" style={{ gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="items-center">
            <Skeleton width={80} height={80} borderRadius={24} className="mb-2.5" />
            <Skeleton width={64} height={11} borderRadius={6} />
          </View>
        ))}
      </View>
      <View className="px-5 mb-4">
        <Skeleton width={120} height={22} borderRadius={8} />
      </View>
      <View className="flex-row px-4" style={{ gap: 12 }}>
        {[0, 1].map((i) => (
          <View key={i}>
            <Skeleton width={158} height={158} borderRadius={24} className="mb-2" />
            <Skeleton width={120} height={14} borderRadius={6} className="mb-1" />
            <Skeleton width={80} height={20} borderRadius={6} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
