import React, { useEffect, useState, useMemo, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Clock,
  Plus,
  Minus,
  ShoppingBag,
  Bell,
} from '../components/icons';
import Toast from 'react-native-toast-message';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot, collection, query, limit, getDocs, where } from '../services/reads';
import { db } from '../config/firebase';
import EmptyState from '../components/EmptyState';
import { FavoriteButton } from '../components/ui';
import Loader from '../components/Loader';
import { useCart } from '../context/CartContext';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';
import { isProductUnavailable } from '../utils/productAvailability';
import apiClient from '../services/api';
import { AuthContext } from '../context/AuthContext';


function getDiscountPercent(variant) {
  if (!variant?.price || variant.offerPrice == null || variant.offerPrice >= variant.price) return 0;
  return Math.round(((variant.price - variant.offerPrice) / variant.price) * 100);
}

// Generate contextual highlights for staple/grocery products
function getProductTags(product) {
  if (product?.tags && Array.isArray(product.tags) && product.tags.length > 0) {
    return product.tags;
  }
  const name = (product?.name || '').toLowerCase();
  if (name.includes('dal') || name.includes('pulse')) {
    return ['Unpolished', 'High protein', 'Machine cleaned'];
  }
  if (name.includes('atta') || name.includes('wheat')) {
    return ['100% Whole wheat', '0% Maida', 'Rich in fiber'];
  }
  if (name.includes('rice')) {
    return ['Aged grain', 'Non-sticky', 'Aromatic'];
  }
  if (name.includes('oil') || name.includes('ghee')) {
    return ['Cold pressed', 'Pure & natural', 'Heart healthy'];
  }
  if (name.includes('tomato') || name.includes('veg') || name.includes('fruit')) {
    return ['Farm fresh', 'Chemical free', 'Hand picked'];
  }
  return product?.tag ? [product.tag] : ['Premium quality', 'Freshly packed'];
}

export default function ProductDetailScreen({ route, navigation }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [currentId, setCurrentId] = useState(id);
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [restockAlertEnabled, setRestockAlertEnabled] = useState(false);
  const { addItem, updateQty, getQty } = useCart();
  const { token } = useContext(AuthContext);

  const addScale = useSharedValue(1);
  const addAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  // Prefer the live Firestore record, then fall back to the backend catalog if
  // this device cannot read that document directly. Product cards are sourced
  // from the API too, so an API-backed item must still be openable here.
  useEffect(() => {
    setLoading(true);
    setError(false);
    let isCancelled = false;
    let fallbackStarted = false;
    const loadFromApi = async () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      try {
        const { data } = await apiClient.get(`/products/${currentId}`, { __skipErrorToast: true });
        if (!isCancelled && data?.id) {
          setProduct(data);
          setSelectedVariant(data.variants?.[0] || null);
          setActiveImageIndex(0);
          setError(false);
        } else if (!isCancelled) {
          setError(true);
        }
      } catch {
        if (!isCancelled) setError(true);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    const unsub = onSnapshot(
      doc(db, 'products', currentId),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setProduct(data);
          setSelectedVariant(data.variants?.[0] || null);
          setActiveImageIndex(0);
          setLoading(false);
        } else {
          loadFromApi();
        }
      },
      loadFromApi
    );
    return () => {
      isCancelled = true;
      unsub();
    };
  }, [currentId]);

  const recommendationProductId = product?.id;
  const recommendationCategoryId = product?.categoryId;

  // Fetch recommendations for "You may also need" section (Image 3)
  useEffect(() => {
    if (!recommendationProductId) return;
    const fetchRecs = async () => {
      try {
        const recQuery = recommendationCategoryId
          ? query(collection(db, 'products'), where('categoryId', '==', recommendationCategoryId), limit(8))
          : query(collection(db, 'products'), limit(8));
        const snap = await getDocs(recQuery);
        let items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.id !== recommendationProductId && !isProductUnavailable(p));
        if (items.length < 4 && recommendationCategoryId) {
          try {
            const fallbackSnap = await getDocs(query(collection(db, 'products'), limit(8)));
            const fallbackItems = fallbackSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((p) => p.id !== recommendationProductId && !isProductUnavailable(p) && !items.some((i) => i.id === p.id));
            items = [...items, ...fallbackItems];
          } catch {
            // Keep items found so far
          }
        }
        setRecommendations(items.slice(0, 4));
      } catch {
        // Fallback
      }
    };
    fetchRecs();
  }, [recommendationProductId, recommendationCategoryId]);


  const triggerAddAnimation = () => {
    addScale.value = withSequence(
      withTiming(0.9, { duration: 90 }),
      withSpring(1, { damping: 9, stiffness: 220 })
    );
  };

  // Only use variants configured in the admin catalog. A single admin price is
  // one purchasable item; the customer app must not invent larger pack prices.
  const variants = useMemo(() => {
    if (!product) return [];
    return Array.isArray(product.variants) ? product.variants : [];
  }, [product]);

  const currentVariant = selectedVariant || (variants.length > 1 ? variants[1] : variants[0]);
  const currentVariantUnavailable = !currentVariant || isProductUnavailable(product, currentVariant);
  const price = currentVariant?.offerPrice ?? currentVariant?.price ?? 0;
  const mrp = currentVariant?.price ?? 0;
  const discount = getDiscountPercent(currentVariant);
  const currentQty = product ? getQty(product.id, currentVariant?.id) : 0;
  const productTags = useMemo(() => getProductTags(product), [product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const primary = getProductImageSource(product, 800);
    const extras = (product.images || []).slice(1).map((uri) => ({ uri: optimizeCloudinaryUrl(uri, 800) }));
    return primary ? [primary, ...extras] : (extras.length ? extras : [null]);
  }, [product]);

  function handleAdd() {
    if (!currentVariant || !product || currentVariantUnavailable) return;
    triggerAddAnimation();
    addItem(product, currentVariant);
  }

  function handleIncrement() {
    if (!currentVariant || !product || currentVariantUnavailable) return;
    triggerAddAnimation();
    if (currentQty === 0) {
      addItem(product, currentVariant);
    } else {
      updateQty(product.id, currentVariant.id, 1);
    }
  }

  function handleDecrement() {
    if (!currentVariant || currentQty === 0 || !product) return;
    triggerAddAnimation();
    updateQty(product.id, currentVariant.id, -1);
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: '#f8fafc',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={24} color="#0f172a" />
          </Pressable>
        </View>
        <Loader />
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
        <EmptyState icon="error" message="Product not found" onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const isOutOfStock = Boolean(
    product?.isOutOfStock ||
    product?.availability === 'OUT_OF_STOCK' ||
    product?.availability === 'UNAVAILABLE_TODAY' ||
    product?.isAvailableToday === false ||
    (variants.length === 0 || variants.every((variant) => isProductUnavailable(product, variant)))
  );

  if (isOutOfStock) {
    const displayAlternatives = recommendations.filter((alt) => !isProductUnavailable(alt));

    const handleRestockAlert = async () => {
      if (!token) {
        Toast.show({ type: 'info', text1: 'Sign in to get restock alerts' });
        return;
      }
      try {
        const { data } = await apiClient.post('/notifications/restock-subscriptions', { productId: product.id });
        setRestockAlertEnabled(true);
        Toast.show({
          type: 'success',
          text1: data.alreadySubscribed ? 'Restock alert is already on' : 'Restock alert turned on',
          text2: `We'll notify you when ${product.name} is available.`,
        });
      } catch (err) {
        Toast.show({ type: 'error', text1: err.response?.data?.error || 'Could not enable restock alert' });
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* Top Product Hero with floating back button matching Image 2 */}
        <View style={{ height: 370, width: '100%', backgroundColor: '#f8fafc', position: 'relative' }}>
          <Image
            source={galleryImages[0]}
            style={{ width: '100%', height: '100%', opacity: 0.58 }}
            contentFit="cover"
          />
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.22)' }} />

          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
            <Text
              numberOfLines={2}
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 22,
                fontWeight: '900',
                color: '#ffffff',
                letterSpacing: -0.4,
              }}
            >
              {product.name}
            </Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: '#ffffff', marginTop: 4 }}>
              {currentVariant?.label || '5 kg'} · ₹{price}
            </Text>
          </View>

          {/* Dark Overlay Out of Stock Badge matching Image 2 */}
          <View
            style={{
              position: 'absolute',
              top: 220,
              alignSelf: 'center',
              backgroundColor: '#0f172a',
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontSize: 11.5,
                fontWeight: '900',
                color: '#ffffff',
                letterSpacing: 0.6,
              }}
            >
              OUT OF STOCK
            </Text>
          </View>

          {/* Floating Back Button matching Image 2 */}
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              position: 'absolute',
              top: Math.max(insets.top, 14),
              left: 18,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.14,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <ChevronLeft size={22} color="#0f172a" strokeWidth={2.6} />
          </Pressable>
        </View>

        {/* Scrollable details */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: Math.max(insets.bottom, 16) + 76,
          }}
        >
          {/* Currently Unavailable Amber Banner matching Image 2 */}
          <View
            style={{
              backgroundColor: '#fffbeb',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#fef3c7',
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: 24,
            }}
          >
            <Clock size={20} color="#b45309" style={{ marginRight: 12, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 14.5,
                  fontWeight: '800',
                  color: '#78350f',
                }}
              >
                Currently unavailable
              </Text>
              <Text
                style={{
                  fontFamily: fonts.medium,
                  fontSize: 12.5,
                  fontWeight: '500',
                  color: '#92400e',
                  marginTop: 2,
                  lineHeight: 18,
                }}
              >
                Turn on alerts and we&apos;ll let you know when it&apos;s back.
              </Text>
            </View>
          </View>

          {/* Available Alternatives matching Image 2 */}
          {displayAlternatives.length > 0 ? <Text
            style={{
              fontFamily: fonts.extraBold,
              fontSize: 16.5,
              fontWeight: '900',
              color: '#0f172a',
              marginBottom: 14,
            }}
          >
            Available alternatives
          </Text> : (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              We couldn&apos;t find an available alternative right now.
            </Text>
          )}

          {displayAlternatives.map((alt) => {
            const altImg = getProductImageSource(alt, 200) || (alt.image ? { uri: optimizeCloudinaryUrl(alt.image, 200) } : null);
            const altPrice = alt.variants?.[0]?.offerPrice ?? alt.variants?.[0]?.price ?? alt.price ?? 0;
            const altPack = alt.variants?.[0]?.label || alt.unit || 'Standard pack';
            const altQty = getQty(alt.id, alt.variants?.[0]?.id || 'default');

            return (
              <View
                key={alt.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: '#f1f5f9',
                }}
              >
                <Pressable
                  onPress={() => {
                    if (alt.id && !alt.id.startsWith('alt_')) {
                      setRestockAlertEnabled(false);
                      navigation.setParams({ isOutOfStock: false });
                      setCurrentId(alt.id);
                    }
                  }}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  {altImg && (
                    <Image source={altImg} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  )}
                </Pressable>

                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 14.5,
                      fontWeight: '800',
                      color: '#0f172a',
                    }}
                  >
                    {alt.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.medium,
                      fontSize: 12,
                      fontWeight: '500',
                      color: '#64748b',
                      marginTop: 1,
                    }}
                  >
                    {altPack}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.extraBold,
                      fontSize: 15,
                      fontWeight: '900',
                      color: '#0f172a',
                      marginTop: 3,
                    }}
                  >
                    ₹{altPrice}
                  </Text>
                </View>

                {altQty === 0 ? (
                  <Pressable
                    onPress={() => addItem(alt, alt.variants?.[0])}
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#047857',
                      borderRadius: 10,
                      paddingHorizontal: 20,
                      paddingVertical: 7,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 13,
                        fontWeight: '800',
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
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      height: 34,
                    }}
                  >
                    <Pressable
                      onPress={() => updateQty(alt.id, alt.variants?.[0]?.id || 'default', -1)}
                      hitSlop={6}
                      style={{ paddingHorizontal: 6 }}
                    >
                      <Minus size={14} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                    <Text
                      style={{
                        fontFamily: fonts.extraBold,
                        fontSize: 13.5,
                        fontWeight: '900',
                        color: '#ffffff',
                        marginHorizontal: 4,
                      }}
                    >
                      {altQty}
                    </Text>
                    <Pressable
                      onPress={() => addItem(alt, alt.variants?.[0])}
                      hitSlop={6}
                      style={{ paddingHorizontal: 6 }}
                    >
                      <Plus size={14} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Sticky Notify Me Button matching Image 4 */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            borderTopWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Pressable
            onPress={handleRestockAlert}
            disabled={restockAlertEnabled}
            style={{
              backgroundColor: restockAlertEnabled ? '#065f46' : '#047857',
              height: 52,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Bell size={18} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15.5, fontWeight: 'normal', color: '#ffffff' }}>
              {restockAlertEnabled ? 'Restock alert is on' : 'Notify me when available'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header Row matching Image 2 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 18,
          paddingVertical: 10,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          zIndex: 10,
        }}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
        </Pressable>

        {/* Right Actions: Favorite Bookmark */}
        <FavoriteButton
          productId={product.id}
          size={20}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 85 }}
      >
        {/* Hero Gallery matching Image 2 */}
        <View style={{ height: 260, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(idx);
            }}
          >
            {galleryImages.map((img, i) => (
              <View
                key={i}
                style={{
                  width: SCREEN_WIDTH,
                  height: 260,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                }}
              >
                {img ? (
                  <Image
                    source={typeof img === 'string' ? { uri: img } : img}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                ) : (
                  <ShoppingBag size={64} color="#cbd5e1" />
                )}
              </View>
            ))}
          </ScrollView>
          {galleryImages.length > 1 && (
            <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {galleryImages.map((_, i) => (
                <View key={i} style={{ width: i === activeImageIndex ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeImageIndex ? '#047857' : '#cbd5e1' }} />
              ))}
            </View>
          )}
        </View>

        {/* Product Details Section matching Image 2 */}
        <View style={{ paddingHorizontal: 18, paddingTop: 10 }}>
          {/* Category breadcrumb */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            {product.categoryName || product.category ? (
              <Pressable
                onPress={() => {
                  if (product.categoryId) {
                    navigation.navigate('Category', { id: product.categoryId, name: product.categoryName || 'Category' });
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, fontWeight: 'normal', color: '#047857' }}>
                  More in {product.categoryName || 'Staples'} ›
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Product Title */}
          <Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 24,
              fontWeight: 'normal',
              color: '#0f172a',
              letterSpacing: -0.5,
              lineHeight: 30,
              marginBottom: 10,
            }}
          >
            {product.name}
          </Text>

          {/* Tags Pills Row matching Screenshot 5 */}
          {productTags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {productTags.map((tag, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 12, fontWeight: 'normal', color: '#334155' }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Pack Size Section matching Screenshot 5 */}
          {variants.length > 1 && (<Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 16,
              fontWeight: 'normal',
              color: '#0f172a',
              letterSpacing: -0.3,
              marginBottom: 12,
            }}
          >
            Pack size
          </Text>)}

          {variants.length > 1 && (<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 }}>
            {variants.map((v) => {
              const isSelected = currentVariant?.id === v.id;
              const vPrice = v.offerPrice ?? v.price ?? 0;
              const vDiscount = getDiscountPercent(v);

              return (
                <Pressable
                  key={v.id}
                  onPress={() => setSelectedVariant(v)}
                  style={{
                    flex: 1,
                    minWidth: 98,
                    backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#047857' : '#e2e8f0',
                    borderRadius: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14.5, fontWeight: 'normal', color: '#0f172a' }}>
                    {v.label}
                  </Text>
                  <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 15.5, fontWeight: 'normal', color: '#0f172a', marginTop: 4 }}>
                    ₹{vPrice}
                  </Text>
                  {vDiscount > 0 ? (
                    <Text style={{ fontFamily: 'Inter-Bold', fontSize: 12, fontWeight: 'normal', color: '#047857', marginTop: 3 }}>
                      {vDiscount}% OFF
                    </Text>
                  ) : (
                    <View style={{ height: 17 }} />
                  )}
                </Pressable>
              );
            })}
          </View>)}

          {/* About this product Section matching Screenshot 5 */}
          <Text
            style={{
              fontFamily: 'Inter-ExtraBold',
              fontSize: 16,
              fontWeight: 'normal',
              color: '#0f172a',
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            About this product
          </Text>

          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 13.5,
              fontWeight: 'normal',
              color: '#475569',
              lineHeight: 21,
              marginBottom: 14,
            }}
          >
            {product.description ||
              'Carefully sourced, sorted and packaged under hygienic conditions to ensure rich flavor and superior freshness.'}
          </Text>

          {/* Specs Box matching Screenshot 5 */}
          <View
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              marginBottom: 28,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>Shelf life</Text>
              <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>
                {product.shelfLife || '6 months'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>Country of origin</Text>
              <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>
                {product.origin || 'India'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13, fontWeight: 'normal', color: '#64748b' }}>Sold by</Text>
              <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 13, fontWeight: 'normal', color: '#0f172a' }}>
                MS Traders
              </Text>
            </View>
          </View>

          {/* "You may also need" Section matching Image 3 */}
          {recommendations.length > 0 && (
            <View style={{ marginBottom: 16 }}>
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
                You may also need
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14 }}
              >
                {recommendations.map((rec) => {
                  const recImg = getProductImageSource(rec, 200);
                  const recPrice = rec.variants?.[0]?.offerPrice ?? rec.variants?.[0]?.price ?? rec.price ?? 0;

                  return (
                    <Pressable
                      key={rec.id}
                      onPress={() => setCurrentId(rec.id)}
                      style={{
                        width: 120,
                        alignItems: 'flex-start',
                      }}
                    >
                      <View
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: 16,
                          backgroundColor: '#f8fafc',
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: '#f1f5f9',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                        }}
                      >
                        {recImg ? (
                          <Image
                            source={recImg}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        ) : (
                          <ShoppingBag size={28} color="#94a3b8" />
                        )}
                      </View>
                      <Text
                        numberOfLines={2}
                        style={{ fontFamily: 'Inter-Bold', fontSize: 12.5, fontWeight: 'normal', color: '#0f172a', lineHeight: 17, minHeight: 34 }}
                      >
                        {rec.name}
                      </Text>
                      <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 13.5, fontWeight: 'normal', color: '#0f172a', marginTop: 3 }}>
                        ₹{recPrice}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar matching Image 2 & 3 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          borderTopWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        {/* Left Pricing matching Screenshot 5 */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12.5, fontWeight: 'normal', color: '#64748b' }}>
              {currentVariant?.label || '1 Unit'}
            </Text>
            {discount > 0 && (
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 12.5, fontWeight: 'normal', color: '#047857', marginLeft: 4 }}>
                · {discount}% OFF
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
            <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 22, fontWeight: 'normal', color: '#0f172a' }}>
              ₹{price}
            </Text>
            {discount > 0 && (
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 13,
                  fontWeight: 'normal',
                  color: '#94a3b8',
                  textDecorationLine: 'line-through',
                  marginLeft: 8,
                }}
              >
                ₹{mrp}
              </Text>
            )}
          </View>
        </View>

        {/* Right Action: Add to Cart button or Stepper */}
        {currentVariantUnavailable ? (
          <View
            style={{
              minWidth: 128,
              height: 48,
              paddingHorizontal: 16,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: '#cbd5e1',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, color: '#64748b' }}>Out of stock</Text>
          </View>
        ) : currentQty === 0 ? (
          <Animated.View style={addAnimatedStyle}>
            <Pressable
              onPress={handleAdd}
              style={{
                backgroundColor: '#047857',
                borderRadius: 14,
                paddingHorizontal: 32,
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 15.5, fontWeight: 'normal', color: '#ffffff' }}>
                Add to cart
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View style={addAnimatedStyle}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#047857',
                borderRadius: 14,
                height: 48,
                paddingHorizontal: 8,
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Pressable
                onPress={handleDecrement}
                hitSlop={6}
                style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={17} color="#ffffff" strokeWidth={3} />
              </Pressable>
              <Text
                style={{
                  fontFamily: 'Inter-ExtraBold',
                  fontSize: 16,
                  fontWeight: 'normal',
                  color: '#ffffff',
                  paddingHorizontal: 12,
                  minWidth: 28,
                  textAlign: 'center',
                }}
              >
                {currentQty}
              </Text>
              <Pressable
                onPress={handleIncrement}
                hitSlop={6}
                style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={17} color="#ffffff" strokeWidth={3} />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
