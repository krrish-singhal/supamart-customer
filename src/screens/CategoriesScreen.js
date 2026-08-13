import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ChevronDown, ChevronUp, Search } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import apiClient from '../services/api';
import { Header, Skeleton, BrandLogo } from '../components/ui';
import EmptyState from '../components/EmptyState';
import subCategoryImages from '../utils/subCategoryImages';
import categoryImages from '../utils/categoryImages';
import slugify from '../utils/slugify';

const TABS = ['Brands', 'Categories'];

// An admin-uploaded photo can be any aspect ratio/size (unlike the bundled defaults,
// which are pre-cropped square PNGs) -- "cover" would crop it unpredictably, so it gets
// "contain" instead (always shows the whole photo) plus an onError fallback in case the
// URL is ever unreachable, so an admin's upload never renders as a broken image.
function CatImage({ uri, bundled }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => { setErrored(false); }, [uri]);

  if (uri && !errored) {
    return (
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={150}
        onError={() => setErrored(true)}
      />
    );
  }
  if (bundled) {
    return <Image source={bundled} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={150} />;
  }
  return null;
}

export default function CategoriesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Brands');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [categoryBrands, setCategoryBrands] = useState({}); // { [categoryId]: brand[] | 'loading' }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [catRes, brandRes] = await Promise.allSettled([
        apiClient.get('/categories'),
        apiClient.get('/brands'),
      ]);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data.items || []);
      if (brandRes.status === 'fulfilled') setBrands(brandRes.value.data.items || []);
      setLoading(false);
    };
    load();
  }, []);

  const topCategories = categories.filter((c) => !c.parentId);
  const subCategoriesOf = useCallback(
    (id) => categories.filter((c) => c.parentId === id),
    [categories]
  );

  const toggleExpand = async (cat) => {
    if (expandedId === cat.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(cat.id);
    if (categoryBrands[cat.id]) return;

    setCategoryBrands((prev) => ({ ...prev, [cat.id]: 'loading' }));
    try {
      const ids = [cat.id, ...subCategoriesOf(cat.id).map((c) => c.id)].slice(0, 10);
      const snap = await getDocs(query(collection(db, 'products'), where('categoryId', 'in', ids)));
      const brandIds = new Set(snap.docs.map((d) => d.data().brandId).filter(Boolean));
      setCategoryBrands((prev) => ({ ...prev, [cat.id]: brands.filter((b) => brandIds.has(b.id)) }));
    } catch {
      setCategoryBrands((prev) => ({ ...prev, [cat.id]: [] }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
        <Header title="Categories" showBack={false} />
        <View className="p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={64} borderRadius={16} className="mb-3" />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-50" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <Header title="Categories" showBack={false} />

      <Pressable
        onPress={() => navigation.navigate('Search')}
        className="flex-row items-center bg-white border border-border rounded-2xl px-4 mx-4 mt-3 mb-2 shadow-soft"
        style={{ height: 48 }}
      >
        <Search size={18} color="#94a3b8" />
        <Text className="ml-3 text-sm font-medium text-text-tertiary flex-1">Search Products</Text>
      </Pressable>

      <View className="flex-row px-4 border-b border-border-light">
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="mr-6 pb-3"
            style={{ borderBottomWidth: 2, borderBottomColor: activeTab === tab ? '#16a34a' : 'transparent' }}
          >
            <Text
              className={`text-sm ${activeTab === tab ? 'font-black text-primary-600' : 'font-semibold text-text-tertiary'}`}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'Brands' ? (
        brands.length === 0 ? (
          <EmptyState icon="box" message="No brands yet" />
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap justify-between">
              {brands.map((brand) => (
                <Pressable
                  key={brand.id}
                  onPress={() => navigation.navigate('ProductList', { brandId: brand.id, title: brand.name })}
                  style={{ width: '31.5%', marginBottom: 16 }}
                  className="items-center"
                >
                  <BrandLogo brand={brand} size={78} style={{ marginBottom: 6 }} />
                  <Text className="text-xs font-semibold text-text-primary text-center" numberOfLines={2}>
                    {brand.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )
      ) : topCategories.length === 0 ? (
        <EmptyState icon="box" message="No categories yet" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {topCategories.map((cat) => {
            const expanded = expandedId === cat.id;
            const subCats = subCategoriesOf(cat.id);
            const catBrandsState = categoryBrands[cat.id];

            return (
              <View key={cat.id} className="border-b border-border-light">
                <Pressable
                  onPress={() => toggleExpand(cat)}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <View className="w-11 h-11 rounded-xl overflow-hidden bg-surface-100 mr-3">
                    {/* An admin-uploaded photo (cat.image, a live Firestore field) always
                        overrides the bundled default -- otherwise editing a category's image
                        from the admin portal would silently never show up here. */}
                    <CatImage uri={cat.image} bundled={categoryImages[slugify(cat.name)]} />
                  </View>
                  <Text className="flex-1 text-sm font-bold text-text-primary">{cat.name}</Text>
                  <View className="w-8 h-8 rounded-full bg-surface-100 items-center justify-center">
                    {expanded ? <ChevronUp size={16} color="#0f172a" /> : <ChevronDown size={16} color="#0f172a" />}
                  </View>
                </Pressable>

                {expanded && (
                  <Animated.View entering={FadeIn.duration(200)} className="px-4 pb-4">
                    <Text className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">Brands</Text>
                    {catBrandsState === 'loading' ? (
                      <View className="flex-row" style={{ gap: 10 }}>
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} width={68} height={68} borderRadius={12} />
                        ))}
                      </View>
                    ) : catBrandsState && catBrandsState.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                        {catBrandsState.map((brand) => (
                          <Pressable
                            key={brand.id}
                            onPress={() => navigation.navigate('ProductList', { brandId: brand.id, title: brand.name })}
                            className="items-center"
                            style={{ width: 76 }}
                          >
                            <BrandLogo brand={brand} size={68} style={{ marginBottom: 4 }} />
                            <Text className="text-[11px] font-medium text-text-secondary text-center" numberOfLines={1}>
                              {brand.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text className="text-xs font-medium text-text-tertiary mb-1">No brands yet</Text>
                    )}

                    {subCats.length > 0 && (
                      <>
                        <Text className="text-xs font-bold text-text-tertiary uppercase tracking-wider mt-4 mb-2">
                          Sub-Categories
                        </Text>
                        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                          {subCats.map((sub) => (
                            <Pressable
                              key={sub.id}
                              onPress={() => navigation.navigate('Category', { id: sub.id, name: sub.name })}
                              style={{ width: 84 }}
                              className="items-center"
                            >
                              <View className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-100 mb-1.5">
                                {/* An admin-uploaded photo (sub.image, a live Firestore field)
                                    always overrides the bundled default -- otherwise editing a
                                    sub-category's image from the admin portal would silently
                                    never show up here. */}
                                <CatImage uri={sub.image} bundled={subCategoryImages[`${slugify(cat.name)}-${slugify(sub.name)}`]} />
                              </View>
                              <Text className="text-[11px] font-semibold text-text-primary text-center" numberOfLines={2}>
                                {sub.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
