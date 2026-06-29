import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StatusBar, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Minus, Plus, ChevronLeft, MapPin, ShoppingBag } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import EmptyState from '../components/EmptyState';
import { Button, Card, Skeleton, Header } from '../components/ui';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { addItem, updateQty, getQty } = useCart();

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

  if (error || !product) return <EmptyState icon="error" message="Product not found" onRetry={load} />;

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

      {/* Floating back button */}
      <View className="absolute left-0 right-0 z-10 px-4 py-2 flex-row items-center pointer-events-box-none" style={{ top: insets.top || 16 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-white/80 items-center justify-center backdrop-blur-md shadow-sm border border-white/50"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Image gallery */}
        <Animated.View entering={FadeIn.duration(400)} className="bg-white rounded-b-3xl shadow-sm border-b border-border-light pb-6 overflow-hidden">
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(product.images?.length ? product.images : [null]).map((uri, i) => (
              <View key={i} style={{ width, height: 320 }} className="items-center justify-center p-8">
                {uri ? (
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
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
            <Text className="text-sm font-semibold text-text-secondary">{product.unit}</Text>
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
                    className={`mr-3 px-4 py-3 rounded-2xl border min-w-[120px] ${
                      selectedVariant?.id === v.id
                        ? 'border-primary-600 bg-primary-50 shadow-sm'
                        : 'border-border-light bg-white shadow-sm'
                    }`}
                  >
                    <Text className={`text-sm font-bold mb-1 ${selectedVariant?.id === v.id ? 'text-primary-700' : 'text-text-primary'}`}>
                      {v.label}
                    </Text>
                    <Text className={`text-xs ${selectedVariant?.id === v.id ? 'text-primary-600' : 'text-text-secondary'}`}>
                      ₹{v.offerPrice ?? v.price}
                    </Text>
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

          {/* Delivery Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} className="mb-6">
            <Card elevation="sm" className="p-4 border-0 bg-white flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-4">
                <MapPin size={20} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary">Superfast Delivery</Text>
                <Text className="text-xs font-medium text-text-secondary mt-0.5">Get it delivered in 10-15 minutes</Text>
              </View>
            </Card>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Add to cart / Qty CTA */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(400)}
        className="px-4 pb-8 pt-4 bg-white border-t border-border-light flex-row items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]"
      >
        <View className="flex-1">
          {selectedVariant?.offerPrice && (
            <Text className="text-xs font-bold text-text-tertiary line-through mb-0.5">₹{mrp}</Text>
          )}
          <Text className="text-2xl font-black text-text-primary">₹{price}</Text>
          {selectedVariant?.stock <= 10 && selectedVariant?.stock > 0 && (
            <Text className="text-xs font-bold text-orange-500 mt-1">
              Only {selectedVariant.stock} left
            </Text>
          )}
        </View>

        {outOfStock ? (
          <View className="flex-[1.5] h-14 items-center justify-center bg-surface-100 rounded-2xl border border-border-light">
            <Text className="text-sm font-bold text-text-tertiary">Out of Stock</Text>
          </View>
        ) : currentQty === 0 ? (
          <Button
            title="Add to Cart"
            onPress={handleAdd}
            size="lg"
            fullWidth={false}
            className="flex-[1.5] shadow-md"
          />
        ) : (
          <View className="flex-[1.5] flex-row items-center justify-between bg-primary-50 border border-primary-200 rounded-2xl px-4 h-14">
            <Pressable
              onPress={handleDecrement}
              className="w-9 h-9 rounded-full bg-white border border-border-light items-center justify-center shadow-sm"
            >
              <Minus size={16} color="#0f172a" />
            </Pressable>
            <Text className="text-xl font-black text-primary-700 w-10 text-center">{currentQty}</Text>
            <Pressable
              onPress={handleIncrement}
              className="w-9 h-9 rounded-full bg-primary-600 items-center justify-center shadow-sm"
            >
              <Plus size={16} color="#ffffff" />
            </Pressable>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
