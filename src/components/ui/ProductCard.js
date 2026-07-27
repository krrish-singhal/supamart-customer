import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, ShoppingBag, Star } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProductCard({ item, onPress, onAdd, qty = 0, onIncrement, onDecrement, style }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variant = item.variants?.[0];
  const price = variant?.offerPrice ?? variant?.price ?? 0;
  const mrp = variant?.price ?? 0;
  const imageUri = item.images?.[0] || null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[
        animatedStyle,
        { 
          backgroundColor: '#ffffff', 
          width: 150, // Default width
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
          overflow: 'hidden'
        },
        style,
      ]}
    >
      {/* ── Image Block ── */}
      <View style={{ width: '100%', height: 110, backgroundColor: '#f8fafc' }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={28} color="#cbd5e1" />
          </View>
        )}
        {item.availability === 'OUT_OF_STOCK' && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.78)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>Out of Stock</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Info Block ── */}
      <View style={{ padding: 10 }}>
        {/* Title */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 18, height: 36 }} numberOfLines={2}>
          {item.name} {item.unit ? `${item.unit}` : ''}
        </Text>

        {/* Rating line */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{ flexDirection: 'row' }}>
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={10} color="#16a34a" fill="#16a34a" style={{ marginRight: 2 }} />
            ))}
          </View>
          <Text style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>(24)</Text>
        </View>

        {/* Pricing & Add Button line */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
            ₹{price}
          </Text>

          {item.availability === 'OUT_OF_STOCK' ? (
            <View style={{ width: 50, height: 28 }} />
          ) : qty === 0 ? (
            <Pressable
              onPress={onAdd || onIncrement}
              style={{
                backgroundColor: '#16a34a',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>ADD</Text>
            </Pressable>
          ) : (
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
              borderRadius: 4, height: 28, borderWidth: 1, borderColor: '#16a34a'
            }}>
              <Pressable onPress={onDecrement} style={{ width: 24, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={14} color="#16a34a" strokeWidth={3} />
              </Pressable>
              <Text style={{ width: 16, textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                {qty}
              </Text>
              <Pressable onPress={onIncrement} style={{ width: 24, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={14} color="#16a34a" strokeWidth={3} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}
