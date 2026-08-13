import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon, X, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { Skeleton, ProductCard } from '../components/ui';
import { useCart } from '../context/CartContext';

export default function SearchScreen({ navigation }) {
  const { addItem, updateQty, getQty } = useCart();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await apiClient.get('/products/search', { params: { q, limit: 30 } });
      setResults(data.items || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(text) {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  }

  function clear() {
    setQuery('');
    setResults([]);
    setSearched(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Search bar */}
      <View className="flex-row items-center px-4 pt-4 pb-4 bg-white border-b border-border-light shadow-sm">
        <Pressable onPress={() => navigation.goBack()} className="mr-3 p-1">
          <ArrowLeft size={24} color="#0f172a" />
        </Pressable>
        <View className="flex-1 flex-row items-center bg-surface-100 rounded-2xl px-4 h-12 border border-border-light shadow-sm">
          <SearchIcon size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-base text-text-primary font-medium h-full"
            placeholder="Search for groceries, veggies..."
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={handleChange}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={clear} className="p-1">
              <X size={18} color="#64748b" />
            </Pressable>
          )}
        </View>
      </View>

      {loading && (
        <View className="p-4">
          <Skeleton width="100%" height={90} borderRadius={16} className="mb-3" />
          <Skeleton width="100%" height={90} borderRadius={16} className="mb-3" />
          <Skeleton width="100%" height={90} borderRadius={16} className="mb-3" />
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <EmptyState icon="search" message={`No results for "${query}"`} />
      )}

      {!loading && !searched && (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-4">
            <SearchIcon size={28} color="#16a34a" />
          </View>
          <Text className="text-lg font-bold text-text-primary mb-2">What are you looking for?</Text>
          <Text className="text-sm text-text-secondary text-center leading-5">
            Search for your favorite groceries, snacks, beverages and more...
          </Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index * 50, 300))} style={{ marginBottom: 12 }}>
              <ProductCard
                item={item}
                layout="list"
                onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
                qty={getQty(item.id, item.variants?.[0]?.id)}
                onAdd={() => addItem(item, item.variants?.[0])}
                onIncrement={() => addItem(item, item.variants?.[0])}
                onDecrement={() => updateQty(item.id, item.variants?.[0]?.id, -1)}
              />
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
