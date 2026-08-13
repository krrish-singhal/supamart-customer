import React, { useState, useCallback } from 'react';
import { View, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, where, documentId, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Header, Skeleton, ProductCard } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';

// Firestore 'in' queries cap out at 10 values — chunk the favorite id list.
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function FavoritesScreen({ navigation }) {
  const { favoriteIds } = useFavorites();
  const { addItem, updateQty, getQty } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Favorites" showBack={false} />

      {loading ? (
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={116} borderRadius={8} />
          ))}
        </View>
      ) : products.length === 0 ? (
        <EmptyState icon="empty" message="No favorites yet — tap the heart on any product to save it here" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              item={item}
              layout="list"
              onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
              qty={getQty(item.id, item.variants?.[0]?.id)}
              onAdd={() => addItem(item, item.variants?.[0])}
              onIncrement={() => addItem(item, item.variants?.[0])}
              onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
