import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Minus, Plus, ChevronLeft, ShoppingBag, CheckCircle2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import EmptyState from '../components/EmptyState';
import { Button, Card, Skeleton, Header, ProductCard, FavoriteButton } from '../components/ui';
import { useCart } from '../context/CartContext';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { addItem, updateQty, getQty } = useCart();
  const [recommendations, setRecommendations] = useState([]);
  
  // Same-category alone frequently comes back empty or with just 1-2 items — many
  // categories in this catalog (subcategories especially) only hold a handful of
  // products, and filtering out the current product can leave nothing at all. Layer in
  // same-brand, then a generic pool, as fallbacks so this section reliably shows real
  // cross-sell recommendations instead of silently disappearing for most products.
  useEffect(() => {
    if (!product) return;
    const fetchRecs = async () => {
      try {
        const seen = new Set([product.id]);
        const recs = [];

        const catSnap = await getDocs(
          query(collection(db, 'products'), where('categoryId', '==', product.categoryId), limit(12))
        );
        catSnap.docs.forEach((d) => {
          if (!seen.has(d.id)) { seen.add(d.id); recs.push({ id: d.id, ...d.data() }); }
        });

        if (recs.length < 6 && product.brandId) {
          const brandSnap = await getDocs(
            query(collection(db, 'products'), where('brandId', '==', product.brandId), limit(12))
          );
          brandSnap.docs.forEach((d) => {
            if (!seen.has(d.id)) { seen.add(d.id); recs.push({ id: d.id, ...d.data() }); }
          });
        }

        if (recs.length < 6) {
          const genSnap = await getDocs(query(collection(db, 'products'), limit(20)));
          genSnap.docs.forEach((d) => {
            if (!seen.has(d.id) && recs.length < 10) { seen.add(d.id); recs.push({ id: d.id, ...d.data() }); }
          });
        }

        setRecommendations(recs.slice(0, 10));
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.categoryId, product?.brandId]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'products', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setProduct(data);
        setSelectedVariant(prev => {
          // Keep selected variant if it still exists; otherwise default to first
          if (prev) {
            const still = data.variants?.find(v => v.sku === prev.sku || v.label === prev.label);
            if (still) return still;
          }
          return data.variants?.[0] || null;
        });
        setLoading(false);
      } else {
        setError(true);
        setLoading(false);
      }
    }, () => {
      setError(true);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header title="" onBack={() => navigation.goBack()} />
        <Skeleton width="100%" height={300} borderRadius={0} />
        <View className="p-4 mt-4">
          <Skeleton width="80%" height={30} className="mb-4" />
          <Skeleton width="40%" height={20} className="mb-6" />
          <Skeleton width="100%" height={80} borderRadius={16} className="mb-6" />
          <Skeleton width="60%" height={40} className="mb-4" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) return <EmptyState icon="error" message="Product not found" onRetry={() => navigation.goBack()} />;

  const price = selectedVariant?.offerPrice ?? selectedVariant?.price ?? 0;
  const mrp = selectedVariant?.price ?? 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const currentQty = selectedVariant ? getQty(product.id, selectedVariant.id) : 0;
  const outOfStock = selectedVariant?.stock === 0;

  function handleAdd() {
    if (!selectedVariant || outOfStock) return;
    addItem(product, selectedVariant);
  }

  function handleIncrement() {
    if (!selectedVariant) return;
    if (currentQty === 0) {
      addItem(product, selectedVariant);
    } else {
      updateQty(product.id, selectedVariant.id, 1);
    }
  }

  function handleDecrement() {
    if (!selectedVariant || currentQty === 0) return;
    updateQty(product.id, selectedVariant.id, -1);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Floating back + favorite buttons */}
      <View className="absolute left-0 right-0 z-10 px-4 py-2 flex-row items-center justify-between pointer-events-box-none" style={{ top: insets.top || 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-white/80 items-center justify-center backdrop-blur-md shadow-sm border border-white/50"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </Pressable>
        <FavoriteButton
          productId={product.id}
          size={20}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Image gallery */}
        <Animated.View entering={FadeIn.duration(400)} className="bg-white rounded-b-3xl shadow-sm border-b border-border-light pb-6 overflow-hidden">
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(() => {
              // Same priority as ProductCard/everywhere else: a real admin-uploaded photo
              // (product.images[0]) overrides the bundled default, so replacing a photo from
              // the admin portal (e.g. packaging changed) actually shows up here too, instead
              // of this screen silently keeping the old bundled photo forever.
              const primary = getProductImageSource(product, 800); // full-width hero, needs more than the 320px card default
              const extras = (product.images || []).slice(1).map((uri) => ({ uri: optimizeCloudinaryUrl(uri, 800) }));
              const gallery = primary ? [primary, ...extras] : (extras.length ? extras : [null]);
              return gallery;
            })().map((img, i) => (
              <View key={i} style={{ width, height: 320 }} className="items-center justify-center p-8">
                {img ? (
                  <Image source={typeof img === 'string' ? { uri: img } : img} style={{ width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" transition={200} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={64} color="#e2e8f0" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View className="px-5 pt-2">
            {discount > 0 && (
              <View className="bg-primary-600 self-start px-2 py-1 rounded mb-3 shadow-sm">
                <Text className="text-white text-xs font-black uppercase tracking-wider">{discount}% OFF</Text>
              </View>
            )}
            <Text className="text-2xl font-black text-text-primary leading-8 mb-1">{product.name}</Text>
          </View>
        </Animated.View>

        <View className="p-5">
          {/* Variants */}
          {product.variants?.length > 1 && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)} className="mb-6">
              <Text className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Select Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                {product.variants.map((v) => (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVariant(v)}
                    style={{
                      marginRight: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, minWidth: 120,
                      backgroundColor: selectedVariant?.id === v.id ? '#dcfce7' : '#fff',
                      borderWidth: 1, borderColor: selectedVariant?.id === v.id ? '#16a34a' : '#e2e8f0',
                      position: 'relative'
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
                      {v.label}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#475569' }}>
                      ₹{v.offerPrice ?? v.price}
                    </Text>
                    {selectedVariant?.id === v.id && (
                      <View style={{ position: 'absolute', top: 12, right: 12 }}>
                        <CheckCircle2 size={16} color="#16a34a" fill="#16a34a" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Description */}
          {product.description ? (
            <Animated.View entering={FadeInDown.duration(400).delay(200)} className="mb-6">
              <Text className="text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Product Details</Text>
              <Card elevation="sm" className="p-4 border-0 bg-white">
                <Text className="text-sm font-medium text-text-secondary leading-6">{product.description}</Text>
              </Card>
            </Animated.View>
          ) : null}

        </View>

        {/* People usually pair this with */}
        {recommendations.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(350)} className="mb-6 mt-2">
            <Text className="text-sm font-bold text-text-primary mb-4 px-5 uppercase tracking-wider">
              People usually pair this with
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {recommendations.map(item => (
                <ProductCard
                  key={item.id}
                  item={item}
                  style={{ width: 140, marginRight: 12 }}
                  onPress={() => navigation.push('ProductDetail', { id: item.id })}
                  qty={getQty(item.id, item.variants?.[0]?.id)}
                  onAdd={() => addItem(item, item.variants?.[0])}
                  onIncrement={() => addItem(item, item.variants?.[0])}
                  onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>

      {/* Add to cart / Qty CTA */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(400)}
        className="px-4 pt-4 bg-white border-t border-border-light flex-row items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: (insets.bottom || 0) + 16 }}
      >
        <View className="flex-1">
          {selectedVariant?.offerPrice && (
            <Text className="text-xs font-bold text-text-tertiary line-through mb-0.5">₹{mrp}</Text>
          )}
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#16a34a' }}>₹{price}</Text>
          {selectedVariant?.stock <= 10 && selectedVariant?.stock > 0 && (
            <Text className="text-xs font-bold text-orange-500 mt-1">
              Only {selectedVariant.stock} left
            </Text>
          )}
        </View>

        {outOfStock ? (
          <View className="flex-[1.5] h-12 items-center justify-center bg-surface-100 rounded-lg border border-border-light">
            <Text className="text-sm font-bold text-text-tertiary">Out of Stock</Text>
          </View>
        ) : currentQty === 0 ? (
          <Button
            title="Add to Cart"
            onPress={handleAdd}
            style={{ flex: 1.5, backgroundColor: '#16a34a', height: 48, borderRadius: 8 }}
            textStyle={{ fontWeight: '800', fontSize: 16 }}
          />
        ) : (
          <View className="flex-[1.5] flex-row items-center justify-between bg-primary-50 border border-primary-200 px-4 h-12" style={{ borderRadius: 8 }}>
            <Pressable
              onPress={handleDecrement}
              className="w-8 h-8 rounded bg-white border border-border-light items-center justify-center shadow-sm"
            >
              <Minus size={16} color="#0f172a" />
            </Pressable>
            <Text className="text-xl font-black text-primary-700 w-10 text-center">{currentQty}</Text>
            <Pressable
              onPress={handleIncrement}
              className="w-8 h-8 rounded bg-primary-600 items-center justify-center shadow-sm"
            >
              <Plus size={16} color="#ffffff" />
            </Pressable>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
