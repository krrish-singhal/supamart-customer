import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Pressable, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ShoppingBag, Plus, Minus } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Skeleton, ProductCard, Header } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useCart } from '../context/CartContext';

export default function CategoryScreen({ route, navigation }) {
  const { id, name } = route.params;
  const { addItem, updateQty, getQty } = useCart();
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    
    setLoading(true);
    setError(false);
    
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('categoryId', '==', id));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setProducts(items);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [id, name, navigation]);



  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
        <Header title={name} onBack={() => navigation.goBack()} />
        <View className="flex-row flex-wrap px-4 pt-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="48%" height={220} borderRadius={24} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <Header title={name} onBack={() => navigation.goBack()} />
      <EmptyState icon="error" message="Couldn't load products" onRetry={() => fetch()} />
    </SafeAreaView>
  );
  if (!products.length) return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <Header title={name} onBack={() => navigation.goBack()} />
      <EmptyState icon="search" message="No products in this category" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title={name} onBack={() => navigation.goBack()} />
      <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const cardWidth = (Dimensions.get('window').width - 32 - 12) / 2;
            return (
              <View style={{ width: cardWidth }}>
                <ProductCard
                item={item}
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                qty={getQty(item.id, item.variants?.[0]?.id)}
                onAdd={() => addItem(item, item.variants?.[0])}
                onIncrement={() => addItem(item, item.variants?.[0])}
                onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
              />
            </View>
            );
          }}
          ListFooterComponent={null}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
