import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import apiClient from '../services/api';
import { Skeleton, ProductCard, Header } from '../components/ui';
import EmptyState from '../components/EmptyState';
import { useCart } from '../context/CartContext';

export default function ProductListScreen({ navigation, route }) {
  const { featured, categoryId, title } = route.params || {};
  const { addItem, updateQty, getQty } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);

  const fetchItems = useCallback(async (nextCursor = null) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (!nextCursor) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = { limit: 20, cursor: nextCursor };
      if (featured) params.featured = 'true';
      if (categoryId) params.categoryId = categoryId;
      const { data } = await apiClient.get('/products', { params });
      setItems((prev) => {
        const merged = nextCursor ? [...prev, ...data.items] : data.items;
        return Array.from(new Map(merged.map((i) => [i.id, i])).values());
      });
      setCursor(data.cursor || null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [featured, categoryId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchItems();
  }, [fetchItems, navigation]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
        <Header title={title || (featured ? 'Featured' : 'Products')} onBack={() => navigation.goBack()} />
        <View className="flex-row flex-wrap px-4 pt-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="47%" height={230} borderRadius={24} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (!items.length) return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <Header title={title || (featured ? 'Featured' : 'Products')} onBack={() => navigation.goBack()} />
      <EmptyState icon="box" message="No products found" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title={title || (featured ? 'Featured' : 'Products')} onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => cursor && fetchItems(cursor)}
        onEndReachedThreshold={0.4}
        renderItem={({ item, index }) => {
          const cardWidth = (Dimensions.get('window').width - 32 - 12) / 2;
          return (
            <Animated.View
              entering={FadeInDown.duration(350).delay(index < 8 ? (index % 2) * 60 : 0)}
              style={{ width: cardWidth }}
            >
              <ProductCard
                item={item}
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                qty={getQty(item.id, item.variants?.[0]?.id)}
                onAdd={() => addItem(item, item.variants?.[0])}
                onIncrement={() => addItem(item, item.variants?.[0])}
                onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
              />
            </Animated.View>
          );
        }}
        ListFooterComponent={
          loadingMore ? (
            <View className="items-center py-4">
              <Text className="text-sm font-medium text-text-tertiary">Loading more…</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
