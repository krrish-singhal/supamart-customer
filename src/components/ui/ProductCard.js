import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, ShoppingBag, Star } from '../icons';
import FavoriteButton from './FavoriteButton';
import { getProductImageSource } from '../../utils/productImages';
import { fonts } from '../../theme/typography';
import { isProductUnavailable } from '../../utils/productAvailability';



function getStockStatus(item, variant) {
  const stock = variant?.stock ?? 0;
  if (isProductUnavailable(item, variant)) return { label: 'Out of Stock', color: '#ef4444' };
  if (stock <= 10) return { label: 'Limited Stock', color: '#d97706' };
  return { label: 'In Stock', color: '#16a34a' };
}

function getProductShortNote(item) {
  if (item?.shortNote) return item.shortNote;
  if (item?.description && item.description.length < 28) return item.description;
  const lower = (item?.name || '').toLowerCase();
  if (lower.includes('tomato')) return 'Tangy, for curries';
  if (lower.includes('corn')) return 'Sweet, juicy kernels';
  if (lower.includes('chilli') || lower.includes('chili')) return 'Medium spice';
  if (lower.includes('gourd')) return 'Tender';
  if (lower.includes('onion')) return 'Medium size';
  if (lower.includes('potato')) return 'All-purpose';
  if (lower.includes('apple')) return 'Crisp & sweet';
  if (lower.includes('banana')) return 'Naturally ripened';
  if (lower.includes('milk')) return 'Fresh & pasteurized';
  if (lower.includes('paneer')) return 'Soft & fresh';
  if (lower.includes('bread')) return 'Freshly baked daily';
  if (lower.includes('dal') || lower.includes('pulse')) return 'High protein, unpolished';
  if (lower.includes('rice')) return 'Aged & aromatic';
  if (lower.includes('atta') || lower.includes('flour')) return '100% whole wheat';
  if (lower.includes('oil')) return 'Pure & cold pressed';
  if (lower.includes('ghee')) return 'Traditional aroma';
  return 'Fresh & handpicked';
}

function AddToCartControl({ outOfStock, qty, onAdd, onIncrement, onDecrement, fullWidth }) {
  if (outOfStock) {
    return (
      <View
        style={{
          height: fullWidth ? 38 : 32,
          borderRadius: 8,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
          width: fullWidth ? '100%' : 68,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: fullWidth ? 12 : 10, fontWeight: 'normal', color: '#ef4444' }} numberOfLines={1}>
          Sold Out
        </Text>
      </View>
    );
  }

  if (qty === 0) {
    return (
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          (onAdd || onIncrement)?.();
        }}
        style={
          fullWidth
            ? { height: 38, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1.2, borderColor: '#0A7C47', alignItems: 'center', justifyContent: 'center', width: '100%' }
            : { height: 32, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1.2, borderColor: '#0A7C47', alignItems: 'center', justifyContent: 'center', width: 68 }
        }
      >
        <Text style={{ fontFamily: 'Inter-Bold', color: '#0A7C47', fontSize: 12.5, fontWeight: 'normal' }} numberOfLines={1}>
          {fullWidth ? 'Add to Cart' : 'ADD'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0A7C47',
        borderRadius: 8,
        height: fullWidth ? 38 : 32,
        width: fullWidth ? '100%' : 70,
        paddingHorizontal: 4,
      }}
    >
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onDecrement?.();
        }}
        style={{ width: 22, height: '100%', alignItems: 'center', justifyContent: 'center' }}
        hitSlop={6}
      >
        <Minus size={13} color="#ffffff" strokeWidth={3} />
      </Pressable>
      <Text style={{ fontFamily: 'Inter-Bold', fontSize: 12.5, fontWeight: 'normal', color: '#ffffff' }}>{qty}</Text>
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onIncrement?.();
        }}
        style={{ width: 22, height: '100%', alignItems: 'center', justifyContent: 'center' }}
        hitSlop={6}
      >
        <Plus size={13} color="#ffffff" strokeWidth={3} />
      </Pressable>
    </View>
  );
}

// layout="categoryGrid" — 2-column grid card matching screenshots 1 & 5
// layout="grid" — compact card for horizontal carousels (150px fixed)
// layout="list" — full-width row for lists
function ProductCard({ item, onPress, onAdd, qty = 0, onIncrement, onDecrement, style, layout = 'grid', cardWidth }) {
  const variant = item.variants?.[0];
  const mrp = Number(variant?.mrp ?? variant?.price ?? item.mrp ?? item.price ?? 0);
  const rawOffer = variant?.offerPrice != null ? variant.offerPrice : item.offerPrice;
  const offerPrice = (rawOffer != null && rawOffer !== '' && !isNaN(Number(rawOffer)) && Number(rawOffer) > 0)
    ? Number(rawOffer)
    : null;
  const isProductOnSale = item.onSale !== false && item.isOnSale !== false && item.availability !== 'UNAVAILABLE';
  const effectiveOfferPrice = isProductOnSale ? offerPrice : null;
  const sellingPrice = effectiveOfferPrice != null ? effectiveOfferPrice : Number(variant?.sellingPrice ?? variant?.price ?? item.price ?? mrp);
  const hasDiscount = isProductOnSale && mrp > 0 && effectiveOfferPrice != null && effectiveOfferPrice < mrp && (variant?.discountPercent !== 0);
  const discount = hasDiscount ? Math.round(((mrp - effectiveOfferPrice) / mrp) * 100) : 0;
  const strikeMrp = hasDiscount ? mrp : null;

  const stockStatus = getStockStatus(item, variant);
  const outOfStock = stockStatus.label === 'Out of Stock';
  const imageSource = getProductImageSource(item);
  const unitLabel = variant?.label || item?.unit || '1 Unit';
  const { fontScale } = useWindowDimensions();

  // Compact category card: square image, aligned details, price and cart control.
  if (layout === 'categoryGrid') {
    const shortNote = getProductShortNote(item);

    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={item.name}
        style={({ pressed }) => [
          {
            width: cardWidth ?? style?.width ?? '48%',
            maxWidth: cardWidth ?? style?.maxWidth ?? '48%',
            flexGrow: 0,
            flexShrink: 0,
            backgroundColor: 'transparent',
            marginBottom: 26,
            overflow: 'hidden',
            opacity: outOfStock ? 0.78 : (pressed ? 0.94 : 1),
          },
          style,
        ]}
      >
        {/* Top Image area with discount tag, veg icon, and ETA pill matching Screenshots 3 & 4 */}
        <View
          style={{
            width: '100%',
            height: cardWidth,
            aspectRatio: 1,
            borderRadius: 14,
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          {imageSource ? (
            <Image
              key={`img-${item.id}`}
              source={imageSource}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={28} color="#cbd5e1" />
            </View>
          )}

          {item.isBestseller === true && (
            <View
              style={{
                position: 'absolute',
                bottom: 7,
                left: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 6,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: '#fff7d6',
                zIndex: 5,
              }}
            >
              <Star size={9} color="#a16207" fill="#facc15" />
              <Text style={{ fontFamily: fonts.bold, fontSize: 8.5, color: '#713f12' }}>Bestseller</Text>
            </View>
          )}

          {/* Top-Left Discount Badge matching Image 3 & 4 (e.g. 21% OFF / 15% OFF) */}
          {hasDiscount && discount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: '#FFB020',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 4,
                alignItems: 'center',
                zIndex: 5,
              }}
            >
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 9.5, fontWeight: 'normal', color: '#451a03', lineHeight: 14 }}>
                {discount}%
              </Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 8.5, fontWeight: 'normal', color: '#451a03', lineHeight: 12 }}>
                OFF
              </Text>
            </View>
          ) : null}

          {/* Top-Right Veg Symbol matching Image 3 & 4 */}
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 15,
              minHeight: 16 * fontScale,
              borderWidth: 1.2,
              borderColor: '#16a34a',
              borderRadius: 3.5,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
            }}
          >
            <View style={{ width: 6.5, height: 6.5, borderRadius: 3.5, backgroundColor: '#16a34a' }} />
          </View>

          {/* Stamped Red "SOLD OUT" badge */}
          {outOfStock && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.55)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 6,
              }}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderColor: '#ef4444',
                  borderRadius: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  transform: [{ rotate: '-12deg' }],
                  backgroundColor: 'rgba(254, 242, 242, 0.95)',
                }}
              >
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 13, fontWeight: 'normal', color: '#ef4444', letterSpacing: 1.2 }}>
                  SOLD OUT
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Product Details Section directly on screen background matching Image 3 & 4 */}
        <View style={{ paddingTop: 8, paddingHorizontal: 1, paddingBottom: 4, width: '100%', minWidth: 0 }}>
          {/* Unit / Weight Label */}
          <Text
            style={{ fontFamily: fonts.regular, fontSize: 11, fontWeight: 'normal', color: '#64748b', minHeight: 16 * fontScale }}
            numberOfLines={1}
          >
            {unitLabel}
          </Text>

          {/* Product Title */}
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 13,
              fontWeight: 'normal',
              color: '#0f172a',
              marginTop: 1,
              lineHeight: 17,
              minHeight: 36 * fontScale,
              width: cardWidth ? cardWidth - 2 : '100%',
              maxWidth: '100%',
              minWidth: 0,
              flexShrink: 1,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>

          {/* Short Note / Subtitle */}
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 11,
              fontWeight: 'normal',
              color: '#64748b',
              marginTop: 1,
              minHeight: 16 * fontScale,
            }}
            numberOfLines={1}
          >
            {shortNote}
          </Text>

          {/* Bottom Row: Price & Action Control matching HomeScreen & mockups */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
              marginTop: 6,
              minHeight: 34,
            }}
          >
            {/* Price Column */}
            <View style={{ justifyContent: 'center', flexShrink: 1, marginRight: 2 }}>
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 14.5,
                  fontWeight: 'normal',
                  color: '#0f172a',
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                ₹{sellingPrice.toFixed(0)}
              </Text>
              {hasDiscount && strikeMrp != null ? (
                <Text
                  style={{
                    fontFamily: fonts.regular,
                    fontSize: 10,
                    fontWeight: 'normal',
                    color: '#94a3b8',
                    textDecorationLine: 'line-through',
                    lineHeight: 12,
                  }}
                  numberOfLines={1}
                >
                  ₹{strikeMrp.toFixed(0)}
                </Text>
              ) : null}
            </View>

            {/* Action Button: ADD or Stepper matching HomeScreen */}
            {outOfStock ? (
              <View
                style={{
                  height: 32,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#ef4444',
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: '#ef4444' }}>Sold out</Text>
              </View>
            ) : qty === 0 ? (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  (onAdd || onIncrement)?.();
                }}
                hitSlop={6}
                style={{
                  height: 32,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1.2,
                  borderColor: '#0A7C47',
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, fontWeight: 'normal', color: '#0A7C47' }}>ADD</Text>
              </Pressable>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#0A7C47',
                  borderRadius: 8,
                  height: 32,
                  paddingHorizontal: 4,
                  justifyContent: 'space-between',
                  minWidth: 68,
                  maxWidth: 74,
                  flexShrink: 0,
                }}
              >
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onDecrement?.();
                  }}
                  style={{ width: 22, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={6}
                >
                  <Minus size={13} color="#ffffff" strokeWidth={3} />
                </Pressable>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12.5, fontWeight: 'normal', color: '#ffffff', marginHorizontal: 3 }}>
                  {qty}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onIncrement?.();
                  }}
                  style={{ width: 22, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={6}
                >
                  <Plus size={13} color="#ffffff" strokeWidth={3} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // --- Full-width row (layout="list") ---
  if (layout === 'list') {
    return (
      <Pressable
        onPress={onPress}
        style={[
          { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, opacity: outOfStock ? 0.78 : 1 },
          style,
        ]}
      >
        <View style={{ width: 96, height: 96, borderRadius: 4, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {imageSource ? (
            <Image
              key={`img-${item.id}`}
              source={imageSource}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority="high"
              transition={0}
            />
          ) : (
            <ShoppingBag size={28} color="#cbd5e1" />
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={{ flex: 1, fontFamily: 'Inter-Bold', fontSize: 14, fontWeight: 'normal', color: '#0f172a', lineHeight: 19 }} numberOfLines={2}>
              {item.name}
            </Text>
            <FavoriteButton productId={item.id} style={{ marginLeft: 6, marginTop: -4 }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
            <View style={{ marginRight: discount > 0 ? 14 : 0 }}>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, fontWeight: 'normal', color: '#94a3b8' }}>MRP</Text>
              <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
                ₹{(effectiveOfferPrice ?? mrp).toFixed(0)}
              </Text>
            </View>
            {discount > 0 && (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2 }}>
                <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 11, fontWeight: 'normal', color: '#16a34a' }}>{discount}% OFF</Text>
              </View>
            )}
          </View>

          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11, fontWeight: 'normal', color: stockStatus.color, marginTop: 4 }}>
            {stockStatus.label}
          </Text>

          <View style={{ marginTop: 8 }}>
            <AddToCartControl outOfStock={outOfStock} qty={qty} onAdd={onAdd} onIncrement={onIncrement} onDecrement={onDecrement} fullWidth />
          </View>
        </View>
      </Pressable>
    );
  }

  // --- Horizontal Carousel (layout="grid") ---
  return (
    <Pressable
      onPress={onPress}
      delayPressIn={75}
      style={[
        {
          backgroundColor: '#ffffff',
          width: 150,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          overflow: 'hidden',
          opacity: outOfStock ? 0.78 : 1,
        },
        style,
      ]}
    >
      <View style={{ width: '100%', height: 110, backgroundColor: '#f8fafc' }}>
        {imageSource ? (
          <Image
            key={`img-${item.id}`}
            source={imageSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={28} color="#cbd5e1" />
          </View>
        )}
        <FavoriteButton productId={item.id} size={14} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, width: 26, height: 26 }} />
        {outOfStock && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: '-10deg' }], backgroundColor: '#fff' }}>
              <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 11, fontWeight: 'normal', color: '#ef4444' }}>SOLD OUT</Text>
            </View>
          </View>
        )}
      </View>

      <View style={{ padding: 10 }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 13, fontWeight: 'normal', color: '#0f172a', lineHeight: 18, minHeight: 36 }} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 15, fontWeight: 'normal', color: '#0f172a' }}>
            ₹{(effectiveOfferPrice ?? mrp).toFixed(0)}
          </Text>
          {discount > 0 && (
            <Text style={{ fontFamily: 'Inter-ExtraBold', fontSize: 10, fontWeight: 'normal', color: '#16a34a', marginLeft: 6 }}>{discount}% OFF</Text>
          )}
        </View>

        <View style={{ marginTop: 8 }}>
          <AddToCartControl outOfStock={outOfStock} qty={qty} onAdd={onAdd} onIncrement={onIncrement} onDecrement={onDecrement} />
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(ProductCard, (prev, next) => {
  return (
    prev.item?.id === next.item?.id &&
    prev.item?.name === next.item?.name &&
    prev.item?.price === next.item?.price &&
    prev.item?.offerPrice === next.item?.offerPrice &&
    prev.item?.images?.[0] === next.item?.images?.[0] &&
    prev.item?.imageUrl === next.item?.imageUrl &&
    prev.item?.availability === next.item?.availability &&
    prev.qty === next.qty &&
    prev.cardWidth === next.cardWidth &&
    prev.layout === next.layout
  );
});
