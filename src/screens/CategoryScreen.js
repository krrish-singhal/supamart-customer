import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Pressable, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ShoppingBag, Plus, Minus, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Skeleton, ProductCard, Header } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useCart } from '../context/CartContext';

export default function CategoryScreen({ route, navigation }) {
  const { id, name } = route.params;
  const { items, addItem, updateQty, getQty } = useCart();
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
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            return (
              <ProductCard
                item={item}
                style={{ width: '48%' }}
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                qty={getQty(item.id, item.variants?.[0]?.id)}
                onAdd={() => addItem(item, item.variants?.[0])}
                onIncrement={() => addItem(item, item.variants?.[0])}
                onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
              />
            );
          }}
          ListFooterComponent={null}
        />
      </Animated.View>

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
