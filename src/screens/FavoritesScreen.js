import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StatusBar, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, documentId, getDocs } from '../services/reads';
import { ChevronLeft, ShoppingBag } from '../components/icons';
import { db } from '../config/firebase';
import { Skeleton, ProductCard, CartBar, CART_BAR_SPACER } from '../components/ui';
import EmptyState from '../components/EmptyState';
import ProductDetailModal from '../components/ProductDetailModal';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';

// Firestore 'in' queries cap out at 10 values — chunk the favorite id list.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function FavoritesScreen({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(120, Math.floor((windowWidth - 28) / 2));
  const { favoriteIds } = useFavorites();
  const { items: cartItems, addItem, updateQty, getQty } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);

  const load = useCallback(async () => {
    if (!favoriteIds.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const chunks = chunk(favoriteIds, 10);
      const results = await Promise.all(
        chunks.map((ids) => getDocs(query(collection(db, 'products'), where(documentId(), 'in', ids))))
      );
      const items = results.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // Preserve most-recently-favorited-first order.
      const byId = new Map(items.map((p) => [p.id, p]));
      setProducts(favoriteIds.map((id) => byId.get(id)).filter(Boolean).reverse());
    } finally {
      setLoading(false);
    }
  }, [favoriteIds]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Home' });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header matching consistent system style */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 16,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
        }}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={10}
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
        >
          <ChevronLeft size={22} color="#0f172a" strokeWidth={2.5} />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>
          Favorites
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View
          style={{
            padding: 10,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: '48.8%', marginBottom: 12 }}>
              <Skeleton width="100%" height={130} borderRadius={12} />
              <Skeleton width="60%" height={16} borderRadius={4} className="mt-2" />
              <Skeleton width="40%" height={14} borderRadius={4} className="mt-1" />
            </View>
          ))}
        </View>
      ) : products.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <EmptyState
            icon="heart"
            message="No favorites yet — tap the heart on any product to save it here"
          />
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#047857',
              borderRadius: 14,
              paddingHorizontal: 20,
              paddingVertical: 12,
              marginTop: 20,
            }}
          >
            <ShoppingBag size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
              Start Shopping
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          extraData={cartItems}
          numColumns={2}
          columnWrapperStyle={{
            gap: 8,
            paddingHorizontal: 10,
            justifyContent: 'flex-start',
          }}
          contentContainerStyle={{
            paddingTop: 10,
            paddingBottom: cartItems.length > 0 ? CART_BAR_SPACER + 16 : 24,
          }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              layout="categoryGrid"
              cardWidth={cardWidth}
              onPress={() => setSelectedModalProduct(item)}
              qty={getQty(item.id, item.variants?.[0]?.id)}
              onAdd={() => addItem(item, item.variants?.[0])}
              onIncrement={() => addItem(item, item.variants?.[0])}
              onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
            />
          )}
        />
      )}

      {/* Floating Cart Bar */}
      <CartBar
        items={cartItems}
        onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
      />

      {/* Product Detail Bottom Sheet Modal */}
      <ProductDetailModal
        visible={!!selectedModalProduct}
        product={selectedModalProduct}
        onClose={() => setSelectedModalProduct(null)}
      />
    </SafeAreaView>
  );
}
