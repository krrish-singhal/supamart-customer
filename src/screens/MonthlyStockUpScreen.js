import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  ChevronLeft,
  Search,
  Share2,
  Lock,
  Clock,
  Plus,
  Minus,
  ChevronRight,
  ShoppingBag,
  Sparkles,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCart } from '../context/CartContext';
import ProductDetailModal from '../components/ProductDetailModal';
import { getProductImageSource } from '../utils/productImages';

const CLUB_THRESHOLD = 599;

// Fallback curated staple items matching Image 5
const CURATED_STAPLES = [
  {
    id: 'staple-atta',
    name: 'Whole Wheat Atta',
    unit: '10 kg',
    price: 480,
    offerPrice: 420,
    clubPrice: 399,
    discount: 12,
    image: require('../../assets/Cleaned_Products/Elite Atta.webp'),
    variants: [{ id: '10kg', label: '10 kg', price: 480, offerPrice: 420 }],
  },
  {
    id: 'staple-rice',
    name: 'Basmati Rice',
    unit: '5 kg',
    price: 720,
    offerPrice: 610,
    clubPrice: 580,
    discount: 15,
    image: require('../../assets/Cleaned_Products/SSK Ponni Rice 1st.webp'),
    variants: [{ id: '5kg', label: '5 kg', price: 720, offerPrice: 610 }],
  },
  {
    id: 'staple-oil',
    name: 'Sunflower Oil',
    unit: '5 L',
    price: 725,
    offerPrice: 640,
    clubPrice: 608,
    discount: 11,
    image: require('../../assets/Cleaned_Products/Ruchi Gold Palm Oil.webp'),
    variants: [{ id: '5L', label: '5 L', price: 725, offerPrice: 640 }],
  },
  {
    id: 'staple-dal',
    name: 'Toor Dal (Unpolished)',
    unit: '2 kg',
    price: 370,
    offerPrice: 299,
    clubPrice: 284,
    discount: 19,
    image: require('../../assets/Cleaned_Products/Kadala Paruppu Chana Dal.webp'),
    variants: [{ id: '2kg', label: '2 kg', price: 370, offerPrice: 299 }],
  },
  {
    id: 'staple-sugar',
    name: 'Refined Sugar',
    unit: '5 kg',
    price: 240,
    offerPrice: 204,
    clubPrice: 195,
    discount: 15,
    image: require('../../assets/Cleaned_Products/Refined Sugar.webp'),
    variants: [{ id: '5kg', label: '5 kg', price: 240, offerPrice: 204 }],
  },
  {
    id: 'staple-salt',
    name: 'Iodized Crystal Salt',
    unit: '1 kg',
    price: 30,
    offerPrice: 26,
    clubPrice: 24,
    discount: 13,
    image: require('../../assets/Cleaned_Products/Iodized Crystal Salt.webp'),
    variants: [{ id: '1kg', label: '1 kg', price: 30, offerPrice: 26 }],
  },
];

export default function MonthlyStockUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { items: cartItems, addItem, updateQty, getQty, subtotal, itemCount } = useCart();
  const [products, setProducts] = useState(CURATED_STAPLES);
  const [selectedModalProduct, setSelectedModalProduct] = useState(null);

  useEffect(() => {
    const fetchStaples = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'products'), limit(20)));
        const dbItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const staplesOnly = dbItems.filter((p) => {
          const n = (p.name || '').toLowerCase();
          return (
            n.includes('rice') ||
            n.includes('atta') ||
            n.includes('oil') ||
            n.includes('dal') ||
            n.includes('sugar') ||
            n.includes('salt') ||
            n.includes('ghee') ||
            n.includes('pulse')
          );
        });
        if (staplesOnly.length >= 4) {
          // Augment with club price (approx 5% below offer price)
          const augmented = staplesOnly.map((p) => {
            const op = p.offerPrice ?? p.price ?? 0;
            return {
              ...p,
              clubPrice: Math.round(op * 0.95),
            };
          });
          setProducts(augmented);
        }
      } catch {
        // Fallback to CURATED_STAPLES
      }
    };
    fetchStaples();
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Stock up on monthly staples at up to 20% off on MS Traders!',
      });
    } catch {
      // Ignore
    }
  };

  // Upsell calculations
  const remainingForClub = Math.max(0, CLUB_THRESHOLD - subtotal);
  const progressRatio = Math.min(1, subtotal / CLUB_THRESHOLD);
  const hasUnlockedClub = subtotal >= CLUB_THRESHOLD;

  // Retrieve the last food item added to cart and its thumbnail image
  const lastCartItem = cartItems && cartItems.length > 0 ? cartItems[cartItems.length - 1] : null;
  const matchedProduct = lastCartItem
    ? products.find((p) => p.id === lastCartItem.id || p.id === lastCartItem.productId || p.name === lastCartItem.name)
    : null;
  const resolvedImgSource = lastCartItem
    ? (getProductImageSource(lastCartItem) || (matchedProduct ? getProductImageSource(matchedProduct) : null) || (lastCartItem.name ? getProductImageSource({ name: lastCartItem.name }) : null))
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
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
              Up to 20% off on staples
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
          <Pressable
            onPress={handleShare}
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={19} color="#0f172a" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* Main 2-Column Product Grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        extraData={cartItems}
        columnWrapperStyle={{
          gap: 12,
          paddingHorizontal: 16,
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
        contentContainerStyle={{
          paddingTop: 14,
          paddingBottom: 72,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          /* MS Club Notice Banner matching Image 5 */
          <View
            style={{
              backgroundColor: '#e6f7ef',
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              marginHorizontal: 16,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Lock size={15} color="#059669" strokeWidth={2.4} />
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 }}>
              MS Club members pay the{' '}
              <Text style={{ fontWeight: '800', color: '#0f172a' }}>club price</Text> on orders
              above ₹599
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const variant = item.variants?.[0] || { id: 'standard', label: item.unit || '1 Unit' };
          const qty = getQty(item.id, variant.id);
          const inCart = qty > 0;
          const price = item.offerPrice ?? item.price ?? 0;
          const mrp = item.price ?? 0;
          const discount = item.discount || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
          const clubPrice = item.clubPrice || Math.round(price * 0.95);
          const imageSrc = item.image || getProductImageSource(item, 400);

          return (
            <Animated.View
              entering={FadeInDown.duration(350).delay(Math.min(index * 50, 300))}
              style={{
                width: '48.2%',
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 10,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 5,
                elevation: 1,
              }}
            >
              <Pressable onPress={() => setSelectedModalProduct(item)}>
                {/* Visual Area */}
                <View
                  style={{
                    height: 138,
                    borderRadius: 14,
                    backgroundColor: '#f8fafc',
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Discount Badge */}
                  {discount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        backgroundColor: '#f59e0b',
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 6,
                        zIndex: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#ffffff' }}>
                        {discount}% OFF
                      </Text>
                    </View>
                  )}

                  {/* Delivery time pill */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.94)',
                      paddingHorizontal: 6,
                      paddingVertical: 2.5,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      zIndex: 2,
                    }}
                  >
                    <Clock size={11} color="#059669" strokeWidth={2.4} style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0f172a' }}>
                      18 MINS
                    </Text>
                  </View>

                  {imageSrc ? (
                    <Image
                      source={imageSrc}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <ShoppingBag size={42} color="#cbd5e1" />
                  )}
                </View>

                {/* Weight / Unit */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#64748b',
                    marginTop: 8,
                  }}
                >
                  {variant.label || item.unit || '1 Unit'}
                </Text>

                {/* Title */}
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#0f172a',
                    lineHeight: 18,
                    minHeight: 36,
                    marginTop: 2,
                  }}
                >
                  {item.name}
                </Text>
              </Pressable>

              {/* Price & Add Button Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <View>
                  <Text style={{ fontSize: 16.5, fontWeight: '900', color: '#0f172a' }}>
                    ₹{price}
                  </Text>
                  {discount > 0 && (
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: '#94a3b8',
                        textDecorationLine: 'line-through',
                      }}
                    >
                      ₹{mrp}
                    </Text>
                  )}
                </View>

                {inCart ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#059669',
                      borderRadius: 8,
                      height: 32,
                      paddingHorizontal: 4,
                    }}
                  >
                    <Pressable
                      onPress={() => updateQty(item.id, variant.id, -1)}
                      hitSlop={6}
                      style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={13} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff', paddingHorizontal: 6 }}>
                      {qty}
                    </Text>
                    <Pressable
                      onPress={() => addItem(item, variant)}
                      hitSlop={6}
                      style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={13} color="#ffffff" strokeWidth={3} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => addItem(item, variant)}
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#059669',
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 5,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#059669' }}>
                      ADD
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Club Price Pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 6,
                  paddingTop: 4,
                  borderTopWidth: 1,
                  borderColor: '#f8fafc',
                }}
              >
                <Lock size={11} color="#059669" strokeWidth={2.4} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#059669' }}>
                  ₹{clubPrice} club price
                </Text>
              </View>
            </Animated.View>
          );
        }}
      />

      {/* Dynamic Sticky Bottom Upsell Progress Bar (matching Image 5) */}
      <View
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          right: 14,
          backgroundColor: '#047857',
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 16,
          shadowColor: '#047857',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8, flexDirection: 'row', alignItems: 'center' }}>
            {resolvedImgSource && (
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 9,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={resolvedImgSource}
                  style={{ width: 28, height: 28 }}
                  contentFit="contain"
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              {hasUnlockedClub ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={14} color="#86efac" />
                  <Text style={{ fontSize: 13.5, color: '#ffffff', fontWeight: '800' }}>
                    You unlocked MS Club prices!
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: '600' }} numberOfLines={1}>
                  Add <Text style={{ fontWeight: '900', fontSize: 14 }}>₹{remainingForClub}</Text> more to unlock club price
                </Text>
              )}
            </View>
          </View>

          {/* Cart link */}
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Cart' })}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#ffffff', marginRight: 2 }}>
              Cart · {itemCount}
            </Text>
            <ChevronRight size={16} color="#ffffff" strokeWidth={2.8} />
          </Pressable>
        </View>

        {/* Dynamic Progress Bar */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.round(progressRatio * 100)}%`,
              backgroundColor: '#ffffff',
              borderRadius: 2,
            }}
          />
        </View>
      </View>

      {/* Pack Size Detail Modal (Image 4) */}
      <ProductDetailModal
        visible={!!selectedModalProduct}
        product={selectedModalProduct}
        onClose={() => setSelectedModalProduct(null)}
      />
    </SafeAreaView>
  );
}
