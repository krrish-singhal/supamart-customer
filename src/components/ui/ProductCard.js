import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, ShoppingBag } from 'lucide-react-native';
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
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const imageUri = item.images?.[0] || null;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[
        animatedStyle,
        {
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#f1f5f9',
          // Subtle shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        style,
      ]}
    >
      {/* ── Image Block ── strict 1:1 aspect ratio */}
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#f8fafc' }}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={28} color="#cbd5e1" />
          </View>
        )}

        {discount > 0 && (
          <View style={{
            position: 'absolute', top: 7, left: 7,
            backgroundColor: '#16a34a', borderRadius: 6,
            paddingHorizontal: 6, paddingVertical: 3,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: -0.2 }}>
              {discount}% OFF
            </Text>
          </View>
        )}

        {item.availability === 'OUT_OF_STOCK' && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.78)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.07, shadowRadius: 4, elevation: 1,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>Out of Stock</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Info Block ────────────────────────────────────────────────────────
          Every child uses a FIXED height so both columns are always identical
          height regardless of name length → no more misaligned grids.
          Layout:
            paddingTop    : 10
            title area    : 40  (2 lines × 20px line-height)
            gap           :  4
            unit area     : 16
            gap           :  8
            price+btn row : 32
            paddingBottom : 10
          Total info height = 10+40+4+16+8+32+10 = 120px (constant)
      ─────────────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>

        {/* Title — FIXED 40px, always 2-line space reserved */}
        <View style={{ height: 40, marginBottom: 4, overflow: 'hidden' }}>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 20,
              fontWeight: '600',
              color: '#0f172a',
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
        </View>

        {/* Unit — FIXED 16px */}
        <View style={{ height: 16, marginBottom: 8, overflow: 'hidden' }}>
          <Text
            style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8' }}
            numberOfLines={1}
          >
            {item.unit}
          </Text>
        </View>

        {/* Price + Action — FIXED 32px */}
        <View style={{
          height: 32,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Price */}
          <View style={{ flex: 1, justifyContent: 'center', marginRight: 4 }}>
            <Text style={{
              fontSize: 15,
              fontWeight: '900',
              color: '#0f172a',
              letterSpacing: -0.3,
              lineHeight: 20,
            }}>
              ₹{price}
            </Text>
            {discount > 0 && (
              <Text style={{
                fontSize: 10,
                color: '#94a3b8',
                textDecorationLine: 'line-through',
                lineHeight: 14,
              }}>
                ₹{mrp}
              </Text>
            )}
          </View>

          {/* Button */}
          {item.availability === 'OUT_OF_STOCK' ? (
            <View style={{ width: 32, height: 32 }} />
          ) : qty === 0 ? (
            <Pressable
              onPress={onAdd || onIncrement}
              hitSlop={8}
              style={{
                width: 32, height: 32,
                borderRadius: 10,
                backgroundColor: '#f0fdf4',
                borderWidth: 1.5, borderColor: '#86efac',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus size={16} color="#16a34a" strokeWidth={2.5} />
            </Pressable>
          ) : (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#16a34a',
              borderRadius: 10,
              height: 32,
              overflow: 'hidden',
            }}>
              <Pressable
                onPress={onDecrement}
                hitSlop={4}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={13} color="#fff" strokeWidth={2.5} />
              </Pressable>
              <Text style={{
                width: 22, textAlign: 'center',
                fontSize: 13, fontWeight: '800', color: '#fff',
              }}>
                {qty}
              </Text>
              <Pressable
                onPress={onIncrement}
                hitSlop={4}
                style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={13} color="#fff" strokeWidth={2.5} />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}
