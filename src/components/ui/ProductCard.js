import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, ShoppingBag } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import FavoriteButton from './FavoriteButton';
import { getProductImageSource } from '../../utils/productImages';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getDiscountPercent(variant) {
  if (!variant?.price || variant.offerPrice == null || variant.offerPrice >= variant.price) return 0;
  return Math.round(((variant.price - variant.offerPrice) / variant.price) * 100);
}

function getStockStatus(item, variant) {
  const stock = variant?.stock ?? 0;
  if (item.availability === 'OUT_OF_STOCK' || stock <= 0) return { label: 'Out of Stock', color: '#ef4444' };
  if (stock <= 10) return { label: 'Limited Stock', color: '#d97706' };
  return { label: 'In Stock', color: '#16a34a' };
}


// layout="list" buttons are sharp-cornered, white/outlined — matches the client's
// reference boxes exactly ("Register to add to cart" style). layout="grid" buttons
// stay small filled pills since they live in tight horizontal carousels.
function AddToCartControl({ outOfStock, qty, onAdd, onIncrement, onDecrement, fullWidth }) {
  if (outOfStock) {
    return (
      <View
        style={{
          height: fullWidth ? 40 : 34, borderRadius: fullWidth ? 0 : 4,
          backgroundColor: fullWidth ? '#fff' : '#f1f5f9',
          borderWidth: fullWidth ? 1.5 : 0, borderColor: '#e2e8f0',
          alignItems: 'center', justifyContent: 'center', width: fullWidth ? '100%' : 64, paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: fullWidth ? 13 : 10, fontWeight: '700', color: '#94a3b8' }} numberOfLines={1}>
          {fullWidth ? 'Unavailable' : 'Sold Out'}
        </Text>
      </View>
    );
  }
  if (qty === 0) {
    return (
      <Pressable
        onPress={onAdd || onIncrement}
        style={
          fullWidth
            ? { height: 40, borderRadius: 0, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#16a34a', alignItems: 'center', justifyContent: 'center', width: '100%' }
            : { height: 34, borderRadius: 4, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', width: 64 }
        }
      >
        <Text style={{ color: fullWidth ? '#16a34a' : '#fff', fontSize: fullWidth ? 13 : 11, fontWeight: '800' }} numberOfLines={1}>
          {fullWidth ? 'Add to Cart' : 'ADD'}
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff',
      borderRadius: fullWidth ? 0 : 4, height: fullWidth ? 40 : 34, borderWidth: fullWidth ? 1.5 : 1, borderColor: '#16a34a', width: fullWidth ? '100%' : 84,
    }}>
      <Pressable onPress={onDecrement} style={{ width: 36, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Minus size={14} color="#16a34a" strokeWidth={3} />
      </Pressable>
      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>{qty}</Text>
      <Pressable onPress={onIncrement} style={{ width: 36, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={14} color="#16a34a" strokeWidth={3} />
      </Pressable>
    </View>
  );
}

// layout="grid" (default) — compact card for horizontal carousels (recommendations, related items).
// layout="list" — full-width row for the main product listing screens.
export default function ProductCard({ item, onPress, onAdd, qty = 0, onIncrement, onDecrement, style, layout = 'grid' }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const variant = item.variants?.[0];
  const mrp = variant?.price ?? 0;
  const offerPrice = variant?.offerPrice ?? null;
  const discount = getDiscountPercent(variant);
  const stockStatus = getStockStatus(item, variant);
  const outOfStock = stockStatus.label === 'Out of Stock';
  const imageSource = getProductImageSource(item);

  if (layout === 'list') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={[
          animatedStyle,
          { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
          style,
        ]}
      >
        <View style={{ width: 96, height: 96, borderRadius: 4, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {imageSource ? (
            <Image source={imageSource} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} cachePolicy="memory-disk" />
          ) : (
            <ShoppingBag size={28} color="#cbd5e1" />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 19 }} numberOfLines={2}>
              {item.name}
            </Text>
            <FavoriteButton productId={item.id} style={{ marginLeft: 6, marginTop: -4 }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
            <View style={{ marginRight: discount > 0 ? 14 : 0 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>MRP</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                ₹{(offerPrice ?? mrp).toFixed(0)}
              </Text>
            </View>
            {discount > 0 && (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>{discount}% OFF</Text>
              </View>
            )}
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: stockStatus.color, marginTop: 4 }}>
            {stockStatus.label}
          </Text>

          <View style={{ marginTop: 8 }}>
            <AddToCartControl outOfStock={outOfStock} qty={qty} onAdd={onAdd} onIncrement={onIncrement} onDecrement={onDecrement} fullWidth />
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[
        animatedStyle,
        {
          backgroundColor: '#ffffff',
          width: 150,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          overflow: 'hidden'
        },
        style,
      ]}
    >
      <View style={{ width: '100%', height: 110, backgroundColor: '#f8fafc' }}>
        {imageSource ? (
          <Image source={imageSource} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={300} cachePolicy="memory-disk" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={28} color="#cbd5e1" />
          </View>
        )}
        <FavoriteButton productId={item.id} size={14} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, width: 26, height: 26 }} />
        {outOfStock && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.78)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>Out of Stock</Text>
            </View>
          </View>
        )}
      </View>

      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 18, height: 36 }} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
            ₹{(offerPrice ?? mrp).toFixed(0)}
          </Text>
          {discount > 0 && (
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#16a34a', marginLeft: 6 }}>{discount}% OFF</Text>
          )}
        </View>

        <View style={{ marginTop: 8 }}>
          <AddToCartControl outOfStock={outOfStock} qty={qty} onAdd={onAdd} onIncrement={onIncrement} onDecrement={onDecrement} />
        </View>
      </View>
    </AnimatedPressable>
  );
}
