import { getGridMetrics } from '../utils/responsiveLayout';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Search,
  ChevronRight,
  ShoppingBag,
} from '../components/icons';
import apiClient from '../services/api';
import { collection, onSnapshot, query, where } from '../services/reads';
import { db } from '../config/firebase';
import { useCart } from '../context/CartContext';
import { Skeleton, ProductCard } from '../components/ui';
import ProductDetailModal from '../components/ProductDetailModal';
import { getProductImageSource } from '../utils/productImages';

export default function MonthlyStockUpScreen({ navigation }) {
  const { items: cartItems, addItem, updateQty, getQty, subtotal, itemCount } = useCart();
  const { width, fontScale } = useWindowDimensions();
  const [paneWidth, setPaneWidth] = useState(null);
  const { columns, cardWidth } = getGridMetrics(paneWidth ?? width, { padding: 16, gap: 12, fontScale });
  const cartActions = useRef({ addItem, updateQty, getQty });
  cartActions.current = { addItem, updateQty, getQty };
  const [products, setProducts] = useState([]);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const baseProducts = new Map();
    const liveProducts = new Map();
    let apiLoaded = false;
    let apiSucceeded = false;
    let firstSnapshotLoaded = false;
    let snapshotFailed = false;

    const publishProducts = () => {
      if (cancelled || !apiLoaded || (!apiSucceeded && !firstSnapshotLoaded)) return;
      const merged = new Map(baseProducts);
      liveProducts.forEach((product, id) => {
        if (product === null) merged.delete(id);
        else merged.set(id, product);
      });
      setProducts(Array.from(merged.values()));
      setLoading(false);
    };

    const loadAllPages = async () => {
      try {
        let cursor = null;
        do {
          const { data } = await apiClient.get('/products', {
            params: { limit: 50, monthlyStockUp: true, ...(cursor ? { cursor } : {}) },
            __skipErrorToast: true,
          });
          if (cancelled) return;
          (data?.items || []).forEach((product) => baseProducts.set(product.id, product));
          cursor = data?.cursor || null;
        } while (cursor);
        apiSucceeded = true;
      } catch (err) {
        console.warn('Monthly stock-up API load error:', err?.message || err);
      } finally {
        if (cancelled) return;
        setProducts(Array.from(baseProducts.values()));
        setLoading(false);
      }
    };
    loadAllPages();
    return () => { cancelled = true; };
  }, []);


  // Use the same first-item thumbnail and label layout as the Home cart bar.
  const firstCartItem = cartItems?.[0] || null;
  const matchedProduct = firstCartItem
    ? products.find((p) => p.id === firstCartItem.id || p.id === firstCartItem.productId || p.name === firstCartItem.name)
    : null;
  const resolvedImgSource = firstCartItem
    ? (getProductImageSource(firstCartItem) || (matchedProduct ? getProductImageSource(matchedProduct) : null) || (firstCartItem.name ? getProductImageSource({ name: firstCartItem.name }) : null))
    : null;

  const renderProduct = useCallback(({ item }) => {
    const variant = item.variants?.[0];
    if (!variant) return null;
    const qty = cartActions.current.getQty(item.id, variant.id);
    return (
      <ProductCard item={item} layout="categoryGrid" cardWidth={cardWidth} qty={qty}
        onPress={() => setSelectedModalProduct(item)}
        onAdd={() => cartActions.current.addItem(item, variant)}
        onIncrement={() => cartActions.current.addItem(item, variant)}
        onDecrement={() => cartActions.current.updateQty(item.id, variant.id, -1)} />
    );
  }, [cardWidth]);

  return (
    <SafeAreaView onLayout={({ nativeEvent }) => setPaneWidth(nativeEvent.layout.width)} style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header matching Image 5 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 14,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
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
            <ChevronLeft size={24} color="#0f172a" strokeWidth={2.4} />
          </Pressable>

          <View>
            <Text style={{ fontSize: 19, fontWeight: '900', color: '#0f172a' }}>
              Monthly stock-up
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#64748b' }}>
            Admin configured pack sizes and prices
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={() => navigation.navigate('Search')}
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search size={20} color="#0f172a" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* Main 2-Column Product Grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        key={`stock-up-grid-${columns}`}
        numColumns={columns}
        extraData={itemCount}
        columnWrapperStyle={columns > 1 ? {
          gap: 12,
          justifyContent: 'flex-start',
        } : undefined}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 90 * Math.max(1, fontScale),
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? (
          <View style={{ paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 }}>
            {Array.from({ length: 6 }, (_, index) => (
              <View key={index} style={{ width: cardWidth, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Skeleton width="100%" height={138} borderRadius={14} />
                <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
                <Skeleton width="85%" height={18} borderRadius={4} style={{ marginTop: 6 }} />
                <Skeleton width="55%" height={22} borderRadius={4} style={{ marginTop: 14 }} />
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingVertical: 44, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#334155', textAlign: 'center' }}>
              No monthly stock-up products are available right now.
            </Text>
          </View>
        )}
        ListHeaderComponent={null}
        renderItem={renderProduct}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />

      {itemCount > 0 && (
        <Pressable
          onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
          accessibilityRole="button"
          accessibilityLabel={`View cart, ${itemCount} items, ₹${subtotal}`}
          style={{
            position: 'absolute', bottom: 12, left: 14, right: 14, zIndex: 999,
            backgroundColor: '#0a7942', borderRadius: 16, minHeight: 56,
                paddingVertical: 8, paddingHorizontal: 14,
            flexDirection: 'row', alignItems: 'center',
            shadowColor: '#000000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#ffffff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 12, padding: 2 }}>
            {resolvedImgSource ? <Image source={resolvedImgSource} style={{ width: '100%', height: '100%' }} contentFit="contain" /> : <ShoppingBag size={20} color="#0a7942" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 14.5, color: '#ffffff' }}>View cart</Text>
            <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#dcfce7', marginTop: 1 }}>
              {itemCount} item{itemCount === 1 ? '' : 's'} · ₹{subtotal}
            </Text>
          </View>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255, 255, 255, 0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={20} color="#ffffff" strokeWidth={2.8} />
          </View>
        </Pressable>
      )}

      {/* Pack Size Detail Modal (Image 4) */}
      <ProductDetailModal
        visible={!!selectedModalProduct}
        product={selectedModalProduct}
        onClose={() => setSelectedModalProduct(null)}
      />
    </SafeAreaView>
  );
}
