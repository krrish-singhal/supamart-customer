import React, { useEffect, useState, useContext } from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ShoppingBag, Search, ChevronRight, Bell, LogOut } from 'lucide-react-native';
import Animated, {
  FadeInDown, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import Toast from 'react-native-toast-message';
import { Skeleton, BrandLogo, Dialog, CartBar, CART_BAR_SPACER } from '../components/ui';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import categoryImages from '../utils/categoryImages';
import slugify from '../utils/slugify';
import { optimizeCloudinaryUrl, THUMB_CARD, THUMB_ICON } from '../utils/cloudinaryImage';

// Banner art is a square (1:1) image supplied by the client — size the box to match
// exactly so it always renders edge-to-edge with zero cropping.
const BANNER_SIZE = Dimensions.get('window').width - 32; // full width minus px-4 on both sides

export default function HomeScreen({ navigation }) {
  const { items } = useCart();
  const { userProfile, logout } = useContext(AuthContext);
  const { unreadCount } = useNotifications();
  const initial = (userProfile?.name || 'U').charAt(0).toUpperCase();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
    Toast.show({ type: 'success', text1: 'Logged out successfully.' });
  };

  const topCategories = categories.filter((c) => !c.parentId);

  useEffect(() => {
    setLoading(true);
    let unsubCats;
    try {
      unsubCats = onSnapshot(query(collection(db, 'categories'), where('isActive', '==', true)), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(list);
        setLoading(false);

        // Warm expo-image's cache for category photos in the background, from the
        // earliest point this data exists — Home is the first screen almost every session
        // starts on, so by the time the user taps into a category tile (here or later on
        // the Categories tab), the image is often already cached instead of popping in.
        // Best-effort/non-blocking: a failed prefetch just falls back to loading normally.
        const topLevel = list.filter((c) => !c.parentId && c.image);
        topLevel.slice(0, 6).forEach((c) => {
          Image.prefetch(optimizeCloudinaryUrl(c.image, THUMB_CARD)).catch(() => {});
        });
        topLevel.forEach((c) => {
          Image.prefetch(optimizeCloudinaryUrl(c.image, THUMB_ICON)).catch(() => {});
        });
      });
      return () => { if (unsubCats) unsubCats(); };
    } catch (e) {
      console.error(e);
      setError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiClient.get('/brands', { __skipErrorToast: true })
      .then((res) => setBrands(res.data.items || []))
      .catch(() => setBrands([]));
  }, []);

  if (loading) return <HomeSkeleton />;

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50 items-center justify-center" edges={['top']}>
        <Text className="text-text-secondary font-medium mb-4">Couldn&apos;t load store</Text>
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
        contentContainerStyle={{ paddingBottom: CART_BAR_SPACER + 16 }}
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
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              className="w-10 h-10 rounded-full bg-white border border-border-light shadow-soft items-center justify-center"
            >
              <Bell size={20} color="#0f172a" />
              {unreadCount > 0 && (
                <View
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full items-center justify-center border-2 border-white"
                  style={{ minWidth: 18, height: 18, paddingHorizontal: 3 }}
                >
                  <Text className="text-white text-[10px] font-black">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('EditProfile')}
              className="w-8 h-8 rounded-full items-center justify-center overflow-hidden border border-border-light shadow-soft"
              style={{ backgroundColor: '#f0fdf4' }}
            >
              {userProfile?.profileImage ? (
                <Image source={{ uri: optimizeCloudinaryUrl(userProfile.profileImage, 100) }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#16a34a' }}>{initial}</Text>
              )}
            </Pressable>
            {/* A red LogOut icon, not an ambiguous 3-dot menu -- so it's obvious what
                tapping this does before the confirmation dialog even opens. */}
            <Pressable
              onPress={() => setShowLogoutDialog(true)}
              className="w-10 h-10 rounded-full bg-white border border-red-100 shadow-soft items-center justify-center"
            >
              <LogOut size={19} color="#ef4444" />
            </Pressable>
          </View>
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

        {/* Brands */}
        {brands.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(90)} className="mb-6">
            <Text className="text-lg font-black text-text-primary tracking-tight px-5 mb-3">
              Shop by Brand
            </Text>
            {/* FlatList, not a plain ScrollView — with up to ~80 brands, a ScrollView would
                mount every logo's <Image> at once, firing that many concurrent
                downloads/decodes the instant Home mounts and competing with the vertical
                scroll for the JS/UI thread. FlatList only mounts what's near-visible and
                loads the rest in as the strip is scrolled. */}
            <FlatList
              horizontal
              data={brands}
              keyExtractor={(brand) => brand.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={5}
              removeClippedSubviews
              renderItem={({ item: brand }) => (
                <Pressable
                  onPress={() => navigation.navigate('ProductList', { brandId: brand.id, title: brand.name })}
                  className="items-center"
                  style={{ width: 82 }}
                >
                  <View className="w-20 h-20 rounded-full bg-white border border-border-light shadow-soft items-center justify-center overflow-hidden mb-1.5">
                    <BrandLogo brand={brand} size={80} style={{ borderRadius: 40, backgroundColor: '#ffffff' }} />
                  </View>
                  <Text className="text-[11px] font-semibold text-text-primary text-center" numberOfLines={1}>
                    {brand.name}
                  </Text>
                </Pressable>
              )}
            />
          </Animated.View>
        )}

        {/* Banner */}
        <Animated.View entering={FadeInDown.duration(350).delay(120)} className="mb-6 px-4">
          <Image
            source={require('../../assets/images/banner.png')}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 20 }}
            contentFit="cover"
          />
        </Animated.View>

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(180)} className="mb-3 px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-black text-text-primary tracking-tight">
                Top Categories
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Categories')}
                className="flex-row items-center"
              >
                <Text className="text-sm font-bold text-primary-600 mr-0.5">View More</Text>
                <ChevronRight size={16} color="#16a34a" />
              </Pressable>
            </View>
            <View className="flex-row flex-wrap justify-between">
              {topCategories.slice(0, 6).map((item, index) => (
                <TopCategoryCard
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={() => navigation.navigate('Category', { id: item.id, name: item.name })}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating Cart Bar */}
      <CartBar items={items} onPress={() => navigation.navigate('Main', { screen: 'Cart' })} />

      <Dialog
        visible={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Cancel"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </SafeAreaView>
  );
}

const CATEGORY_ICONS = {
  vegetables: ShoppingBag, fruits: ShoppingBag, dairy: ShoppingBag, snacks: ShoppingBag,
  beverages: ShoppingBag, groceries: ShoppingBag, household: ShoppingBag, frozen: ShoppingBag,
  bakery: ShoppingBag, meat: ShoppingBag, seafood: ShoppingBag, eggs: ShoppingBag,
  organic: ShoppingBag, personal: ShoppingBag,
};

function getCategoryIcon(item) {
  const key = item.name.toLowerCase().split(' ')[0];
  const IconComponent = CATEGORY_ICONS[key] || ShoppingBag;
  return <IconComponent size={34} color="#64748b" />;
}

// createAnimatedComponent() must run once at module scope, not inside the component body —
// calling it on every render (as this was) mints a brand-new component TYPE each time,
// which forces React to fully unmount+remount the native view on every re-render of
// TopCategoryCard (e.g. whenever the cart badge or notification count changes elsewhere on
// Home, since that re-renders this whole screen). That's a real, visible source of jank,
// not just wasted work.
const AnimPress = Animated.createAnimatedComponent(Pressable);

function TopCategoryCard({ item, onPress, index }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // An admin-uploaded photo can be any aspect ratio/size (unlike the bundled defaults,
  // which are pre-cropped square PNGs) -- "cover" would crop it unpredictably, so it
  // gets "contain" instead (always shows the whole photo, letterboxed if needed) plus
  // an onError fallback in case the URL is ever unreachable, so an admin's upload never
  // renders as a broken image.
  const [uploadErrored, setUploadErrored] = useState(false);
  useEffect(() => { setUploadErrored(false); }, [item.image]);

  const bundled = categoryImages[slugify(item.name)];
  const showUpload = !!item.image && !uploadErrored;

  return (
    <AnimPress
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.95, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 140 }); }}
      style={[animStyle, { width: '31.5%', marginBottom: 12 }]}
      className="items-center bg-white rounded-2xl border border-border-light shadow-soft overflow-hidden"
    >
      <View className="w-full aspect-square items-center justify-center bg-surface-50">
        {/* An admin-uploaded photo (item.image, a live Firestore field) always overrides
            the bundled default -- same priority as getProductImageSource() -- otherwise
            editing a category's image from the admin portal would silently never show up. */}
        {showUpload ? (
          <Image
            source={{ uri: optimizeCloudinaryUrl(item.image, THUMB_CARD) }}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setUploadErrored(true)}
          />
        ) : bundled ? (
          <Image
            source={bundled}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          getCategoryIcon(item)
        )}
      </View>
      <Text
        className="text-xs font-bold text-text-primary text-center leading-4 px-1.5 py-2"
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
        <Skeleton width="100%" height={BANNER_SIZE} borderRadius={20} />
      </View>
      <View className="px-5 mb-3 flex-row items-center justify-between">
        <Skeleton width={140} height={22} borderRadius={8} />
        <Skeleton width={70} height={16} borderRadius={6} />
      </View>
      <View className="flex-row flex-wrap justify-between px-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="31.5%" height={110} borderRadius={16} className="mb-3" />
        ))}
      </View>
    </SafeAreaView>
  );
}
