import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Pressable, ScrollView, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, Bell, ChevronRight, ShoppingBag } from 'lucide-react-native';
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
  const { addItem, updateQty, getQty } = useCart();
  const [config, setConfig] = useState(null);
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

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
          setLoading(false);
        }
      );
    } catch (e) {
      console.error(e);
      setError(true);
      setLoading(false);
    }

    return () => {
      if (unsubConfig) unsubConfig();
      if (unsubBanners) unsubBanners();
      if (unsubCats) unsubCats();
      if (unsubFeatured) unsubFeatured();
    };
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
          <View>
            <View className="flex-row items-center mb-2 mt-1">
              <Image 
                source={require('../../assets/logo.png')} 
                style={{ width: 64, height: 64 }} 
                contentFit="contain" 
              />
            </View>
            {config && (
              <Text className="text-xs font-semibold text-text-tertiary">
                Delivers within {config.serviceRadiusKm}km · 15 min
              </Text>
            )}
          </View>
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

        {/* Categories */}
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

        {/* Featured Products */}
        {featured.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(240)}>
            <View className="flex-row items-center justify-between px-5 mb-4">
              <View>
                <Text className="text-lg font-black text-text-primary tracking-tight">Featured</Text>
                <Text className="text-xs font-semibold text-text-tertiary">Handpicked for you</Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('ProductList', { featured: true, title: 'Featured' })}
                className="flex-row items-center"
              >
                <Text className="text-sm font-bold text-primary-600">See all</Text>
                <ChevronRight size={14} color="#16a34a" />
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => (
                <ProductCard
                  item={item}
                  style={{ width: 158 }}
                  onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                  qty={getQty(item.id, item.variants?.[0]?.id)}
                  onAdd={() => addItem(item, item.variants?.[0])}
                  onIncrement={() => addItem(item, item.variants?.[0])}
                  onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
                />
              )}
            />
          </Animated.View>
        )}
      </ScrollView>
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
  '#fef9c3', '#d1fae5', '#dbeafe', '#fce7f3',
  '#ede9fe', '#ffedd5', '#ecfdf5', '#f0f9ff',
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
        className="w-20 h-20 rounded-3xl items-center justify-center mb-2.5 overflow-hidden"
        style={{
          backgroundColor: bg,
          borderWidth: 1.5,
          borderColor: `${bg}dd`,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: '100%' }}
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
