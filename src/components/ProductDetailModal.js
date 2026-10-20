import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X, Plus, Minus, ArrowRight, ChevronRight, ShoppingBag } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { getProductImageSource } from '../utils/productImages';
import { fonts } from '../theme/typography';

function getDiscountPercent(vPrice, vMrp) {
  if (!vMrp || vPrice == null || vPrice >= vMrp) return 0;
  return Math.round(((vMrp - vPrice) / vMrp) * 100);
}

function calculatePerUnitPrice(label, price) {
  if (!label || !price) return '';
  const match = label.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|unit|pcs)/i);
  if (!match) return `₹${price} / unit`;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'g') {
    if (val >= 100) {
      const per100 = ((price / val) * 100).toFixed(1);
      return `₹${per100} / 100 g`;
    }
    return `₹${(price / val).toFixed(1)} / g`;
  }
  if (unit === 'kg') {
    const per100g = ((price / (val * 1000)) * 100).toFixed(1);
    return `₹${per100g} / 100 g`;
  }
  if (unit === 'ml') {
    if (val >= 100) {
      const per100 = ((price / val) * 100).toFixed(1);
      return `₹${per100} / 100 ml`;
    }
    return `₹${(price / val).toFixed(1)} / ml`;
  }
  if (unit === 'l') {
    const per100ml = ((price / (val * 1000)) * 100).toFixed(1);
    return `₹${per100ml} / 100 ml`;
  }
  return `₹${price} / ${label}`;
}

export default function ProductDetailModal({
  visible,
  product,
  onClose,
  onAddToCart,
  onUpdateQty,
  getQty: propGetQty,
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { addItem, updateQty, getQty } = useCart();

  const handleAddItem = (item, v) => {
    if (typeof onAddToCart === 'function') {
      onAddToCart(item, v);
    } else {
      addItem(item, v);
    }
  };

  const handleUpdateQty = (itemId, variantId, delta) => {
    if (typeof onUpdateQty === 'function') {
      onUpdateQty(itemId, variantId, delta);
    } else {
      updateQty(itemId, variantId, delta);
    }
  };

  const currentGetQty = (itemId, variantId) => {
    if (typeof propGetQty === 'function') {
      return propGetQty(itemId, variantId);
    }
    return getQty(itemId, variantId);
  };

  if (!visible || !product) return null;

  const imageSource = getProductImageSource(product, 200);

  // A purchase choice is shown only when the admin saved that variant.
  const sourceVariants = product.variants?.length
    ? product.variants
    : [{ id: 'default', label: product.unit || '1 item', price: product.price, offerPrice: product.offerPrice, stock: product.stock }];
  const variants = sourceVariants.map((v, i) => {
    const mrp = Number(v.price ?? v.mrp ?? product.price ?? 0);
    const sellingPrice = Number(v.offerPrice ?? v.sellingPrice ?? mrp);
    return {
      id: v.id || `variant_${i}`,
      label: v.label || product.unit || '1 item',
      price: sellingPrice,
      mrp,
      discount: getDiscountPercent(sellingPrice, mrp),
      perUnitPrice: calculatePerUnitPrice(v.label || product.unit, sellingPrice),
      stock: v.stock ?? product.stock ?? 0,
    };
  });

  // Calculate total price of current product's items in cart
  const totalItemAmount = variants.reduce((sum, v) => {
    const qty = currentGetQty(product.id, v.id);
    return sum + qty * v.price;
  }, 0);

  const displayTotal = totalItemAmount > 0 ? totalItemAmount : variants[0]?.price || 0;

  const handleOpenDetails = () => {
    onClose();
    navigation.navigate('ProductDetail', { id: product.id });
  };

  const handleConfirm = () => {
    if (totalItemAmount === 0 && variants[0]) {
      handleAddItem(product, variants[0]);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {/* Floating Circular Close Button matching Image 5 */}
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#1e293b',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <X size={20} color="#ffffff" strokeWidth={2.6} />
          </Pressable>

          <TouchableWithoutFeedback>
            <Animated.View
              entering={FadeInUp.duration(280).springify().damping(16)}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 10,
                maxHeight: '85%',
              }}
            >
              {/* Product Header Row matching Image 5 */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderColor: '#f1f5f9',
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      backgroundColor: '#f8fafc',
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}
                  >
                    {imageSource ? (
                      <Image
                        source={imageSource}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <ShoppingBag size={22} color="#94a3b8" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: fonts.extraBold,
                        fontSize: 16.5,
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: -0.3,
                      }}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        fontSize: 12.5,
                        fontWeight: '500',
                        color: '#64748b',
                        marginTop: 2,
                      }}
                    >
                      {variants.length > 1 ? 'Choose a pack size' : 'Product details'}
                    </Text>
                  </View>
                </View>

                {/* Details > Link matching Image 5 */}
                <Pressable
                  onPress={handleOpenDetails}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13.5,
                      fontWeight: '800',
                      color: '#047857',
                    }}
                  >
                    Details
                  </Text>
                  <ChevronRight size={15} color="#047857" strokeWidth={2.8} style={{ marginLeft: 2 }} />
                </Pressable>
              </View>

              {/* Pack Sizes List matching Image 5 */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ gap: 12, paddingBottom: 6 }}
              >
                {variants.map((v) => {
                  const qty = currentGetQty(product.id, v.id);
                  const inCart = qty > 0;

                  return (
                    <View
                      key={v.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        borderRadius: 14,
                        borderWidth: inCart ? 1.5 : 1,
                        borderColor: inCart ? '#047857' : '#e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      {/* Left: Pack size & Discount pill + Per-unit price */}
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <Text
                            style={{
                              fontFamily: fonts.bold,
                              fontSize: 15,
                              fontWeight: '800',
                              color: '#0f172a',
                            }}
                          >
                            {v.label}
                          </Text>
                          {v.discount > 0 && (
                            <View
                              style={{
                                backgroundColor: '#f59e0b',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: fonts.extraBold,
                                  fontSize: 10,
                                  fontWeight: '900',
                                  color: '#ffffff',
                                }}
                              >
                                {v.discount}% OFF
                              </Text>
                            </View>
                          )}
                        </View>
                        {v.perUnitPrice ? (
                          <Text
                            style={{
                              fontFamily: fonts.regular,
                              fontSize: 12,
                              fontWeight: '500',
                              color: '#64748b',
                              marginTop: 3,
                            }}
                          >
                            {v.perUnitPrice}
                          </Text>
                        ) : null}
                      </View>

                      {/* Right Section: Price Column + Action Button */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Price Column */}
                        <View style={{ alignItems: 'flex-end', marginRight: 12, minWidth: 48, justifyContent: 'center' }}>
                          <Text
                            style={{
                              fontFamily: fonts.extraBold,
                              fontSize: 16.5,
                              fontWeight: '900',
                              color: '#0f172a',
                            }}
                          >
                            ₹{v.price}
                          </Text>
                          {v.discount > 0 && (
                            <Text
                              style={{
                                fontFamily: fonts.regular,
                                fontSize: 11.5,
                                color: '#94a3b8',
                                textDecorationLine: 'line-through',
                                marginTop: 1,
                              }}
                            >
                              ₹{v.mrp}
                            </Text>
                          )}
                        </View>

                        {/* Action: Stepper Capsule if in Cart, else ADD Button */}
                        {inCart ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#047857',
                              borderRadius: 8,
                              height: 36,
                              width: 82,
                              paddingHorizontal: 6,
                            }}
                          >
                            <Pressable
                              onPress={() => handleUpdateQty(product.id, v.id, -1)}
                              hitSlop={8}
                              style={{ width: 24, height: 30, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={15} color="#ffffff" strokeWidth={2.8} />
                            </Pressable>
                            <Text
                              style={{
                                fontFamily: fonts.extraBold,
                                fontSize: 14.5,
                                fontWeight: '900',
                                color: '#ffffff',
                                textAlign: 'center',
                              }}
                            >
                              {qty}
                            </Text>
                            <Pressable
                              onPress={() => handleAddItem(product, v)}
                              hitSlop={8}
                              style={{ width: 24, height: 30, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Plus size={15} color="#ffffff" strokeWidth={2.8} />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => handleAddItem(product, v)}
                            style={{
                              borderWidth: 1.5,
                              borderColor: '#047857',
                              borderRadius: 8,
                              height: 36,
                              width: 82,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: fonts.bold,
                                fontSize: 13,
                                fontWeight: '800',
                                color: '#047857',
                                letterSpacing: 0.3,
                              }}
                            >
                              ADD
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Bottom Confirm Bar matching Image 5 */}
              <Pressable
                onPress={handleConfirm}
                style={{
                  backgroundColor: '#047857',
                  borderRadius: 14,
                  height: 52,
                  marginTop: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 18,
                  shadowColor: '#047857',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 11,
                      fontWeight: '500',
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    Item total
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.extraBold,
                      fontSize: 18,
                      fontWeight: '900',
                      color: '#ffffff',
                    }}
                  >
                    ₹{displayTotal}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 15.5,
                      fontWeight: '800',
                      color: '#ffffff',
                      marginRight: 6,
                    }}
                  >
                    Confirm
                  </Text>
                  <ArrowRight size={18} color="#ffffff" strokeWidth={2.6} />
                </View>
              </Pressable>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
