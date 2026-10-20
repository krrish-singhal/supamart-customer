import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Check, MapPin, Phone } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { getProductImageSource } from '../utils/productImages';
import { optimizeCloudinaryUrl } from '../utils/cloudinaryImage';
import { fonts } from '../theme/typography';

export default function OrderConfirmationScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    orderId,
    orderNo = '10482',
    total = 246,
    items = [],
    savings = 62,
    address = 'Home · [Your delivery address]',
    paymentMethod = 'UPI app',
    deliveryTime = '18 mins',
  } = route.params || {};

  const defaultItems = [
    { name: 'Toor Dal (Unpolished)', unit: '1 kg', qty: 1, price: 158 },
    { name: 'Tomato (Local)', unit: '500 g', qty: 1, price: 22 },
    { name: 'Full Cream Milk', unit: '500 ml', qty: 2, price: 66 },
  ];

  const displayItems = items && items.length > 0 ? items : defaultItems;
  const itemCount = displayItems.reduce((acc, item) => acc + (item.qty || 1), 0) || 4;

  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', state: { routes: [{ name: 'Home' }], index: 0 } }],
    });
  };

  useEffect(() => {
    const onBackPress = () => {
      goHome();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f6f4' }}>
      <StatusBar barStyle="light-content" backgroundColor="#08693d" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}
      >
        {/* TOP FOREST GREEN HERO HEADER matching Image 2 */}
        <View
          style={{
            backgroundColor: '#08693d',
            paddingTop: Math.max(insets.top, 20) + 16,
            paddingBottom: 42,
            paddingHorizontal: 20,
            alignItems: 'center',
            borderBottomLeftRadius: 36,
            borderBottomRightRadius: 36,
          }}
        >
          {/* Circular Badge with Golden-Yellow Ring & Green Checkmark matching Image 2 */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: '#ffffff',
                borderWidth: 3,
                borderColor: '#f59e0b',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 6,
                marginBottom: 16,
              }}
            >
              <Check size={42} color="#08693d" strokeWidth={4} />
            </View>
          </Animated.View>

          {/* Title and Subtitle matching Image 2 */}
          <Text
            style={{
              fontFamily: fonts.extraBold,
              fontSize: 24,
              fontWeight: '900',
              color: '#ffffff',
              letterSpacing: -0.4,
              marginBottom: 4,
            }}
          >
            Order confirmed!
          </Text>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 13.5,
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.88)',
            }}
          >
            Order #{orderNo} · Arriving in {deliveryTime}
          </Text>
        </View>

        {/* CONTENT CONTAINER */}
        <View style={{ paddingHorizontal: 16, marginTop: -22, gap: 14 }}>
          {/* ORDER SUMMARY CARD matching Image 2 */}
          <Animated.View entering={FadeInUp.duration(350).delay(100)}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              {/* Product thumbnails & Amount Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 16,
                }}
              >
                {/* 3 Thumbnails row matching Image 2 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {displayItems.slice(0, 3).map((prod, idx) => {
                    const imgSource =
                      getProductImageSource(prod, 100) ||
                      (prod.image ? { uri: optimizeCloudinaryUrl(prod.image, 100) } : null);
                    return (
                      <View
                        key={idx}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          backgroundColor: '#f8fafc',
                          borderWidth: 1,
                          borderColor: '#f1f5f9',
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {imgSource && (
                          <Image
                            source={imgSource}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                          />
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Amount and Items */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontFamily: fonts.extraBold,
                      fontSize: 22,
                      fontWeight: '900',
                      color: '#0f172a',
                    }}
                  >
                    ₹{total}
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
                    {itemCount} items · paid
                  </Text>
                </View>
              </View>

              {/* Dotted Divider matching Image 2 */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#e2e8f0',
                  paddingTop: 14,
                  gap: 10,
                }}
              >
                {/* Payment */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: '#64748b',
                    }}
                  >
                    Payment
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13.5,
                      fontWeight: '800',
                      color: '#0f172a',
                    }}
                  >
                    {paymentMethod}
                  </Text>
                </View>

                {/* You saved */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: '#64748b',
                    }}
                  >
                    You saved
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13.5,
                      fontWeight: '800',
                      color: '#047857',
                    }}
                  >
                    ₹{savings || 62} on this order
                  </Text>
                </View>

                {/* Delivering to */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: '#64748b',
                    }}
                  >
                    Delivering to
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: '#0f172a',
                      maxWidth: '65%',
                      textAlign: 'right',
                    }}
                  >
                    {address}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* WHAT HAPPENS NEXT CARD matching Image 2 */}
          <Animated.View entering={FadeInUp.duration(350).delay(180)}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 18,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 15.5,
                  fontWeight: '900',
                  color: '#0f172a',
                  marginBottom: 18,
                }}
              >
                What happens next
              </Text>

              {/* 4-Step Horizontal Timeline matching Image 2 */}
              <View style={{ paddingHorizontal: 6, marginBottom: 18 }}>
                {/* Dots and Connecting Lines */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Step 1: Confirmed (Active green check circle) */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#047857',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} color="#ffffff" strokeWidth={3.5} />
                  </View>

                  {/* Line 1 */}
                  <View style={{ flex: 1, height: 2.5, backgroundColor: '#047857' }} />

                  {/* Step 2: Packing (Hollow green ring) */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#ffffff',
                      borderWidth: 2.5,
                      borderColor: '#047857',
                    }}
                  />

                  {/* Line 2 */}
                  <View style={{ flex: 1, height: 2.5, backgroundColor: '#e2e8f0' }} />

                  {/* Step 3: On the way (Hollow gray ring) */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#ffffff',
                      borderWidth: 2,
                      borderColor: '#cbd5e1',
                    }}
                  />

                  {/* Line 3 */}
                  <View style={{ flex: 1, height: 2.5, backgroundColor: '#e2e8f0' }} />

                  {/* Step 4: Delivered (Hollow gray ring) */}
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#ffffff',
                      borderWidth: 2,
                      borderColor: '#cbd5e1',
                    }}
                  />
                </View>

                {/* Step Labels matching Image 2 */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    marginHorizontal: -12,
                  }}
                >
                  <Text
                    style={{
                      width: 64,
                      fontFamily: fonts.bold,
                      fontSize: 11.5,
                      fontWeight: '800',
                      color: '#0f172a',
                      textAlign: 'center',
                    }}
                  >
                    Confirmed
                  </Text>
                  <Text
                    style={{
                      width: 64,
                      fontFamily: fonts.bold,
                      fontSize: 11.5,
                      fontWeight: '800',
                      color: '#0f172a',
                      textAlign: 'center',
                    }}
                  >
                    Packing
                  </Text>
                  <Text
                    style={{
                      width: 64,
                      fontFamily: fonts.medium,
                      fontSize: 11.5,
                      fontWeight: '600',
                      color: '#64748b',
                      textAlign: 'center',
                    }}
                  >
                    On the way
                  </Text>
                  <Text
                    style={{
                      width: 64,
                      fontFamily: fonts.medium,
                      fontSize: 11.5,
                      fontWeight: '600',
                      color: '#64748b',
                      textAlign: 'center',
                    }}
                  >
                    Delivered
                  </Text>
                </View>
              </View>

              {/* Callout box with phone icon matching Image 2 */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f4f8f4',
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <Phone size={16} color="#047857" strokeWidth={2.4} style={{ marginRight: 10 }} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: fonts.regular,
                    fontSize: 12,
                    fontWeight: '500',
                    color: '#475569',
                    lineHeight: 18,
                  }}
                >
                  Keep your phone nearby. Our delivery partner may call when they reach your door.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ACTION BUTTONS matching Image 2 */}
          <View style={{ gap: 12, marginTop: 8 }}>
            {/* Primary: Track order */}
            <Pressable
              onPress={() =>
                navigation.replace('OrderTracking', {
                  orderId,
                  orderNo,
                  fromCheckout: true,
                })
              }
              style={{
                height: 52,
                borderRadius: 16,
                backgroundColor: '#047857',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#047857',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <MapPin size={18} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 8 }} />
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15.5,
                  fontWeight: '800',
                  color: '#ffffff',
                }}
              >
                Track order
              </Text>
            </Pressable>

            {/* Secondary: View order details */}
            <Pressable
              onPress={() =>
                navigation.navigate('OrderDetail', {
                  orderId,
                  orderNo,
                  order: {
                    id: orderId,
                    orderNo,
                    total,
                    items: displayItems,
                    savings,
                    address,
                    paymentMethod,
                    deliveryTime,
                  },
                })
              }
              style={{
                height: 52,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15,
                  fontWeight: '800',
                  color: '#0f172a',
                }}
              >
                View order details
              </Text>
            </Pressable>

            {/* Tertiary: Continue shopping */}
            <Pressable
              onPress={goHome}
              style={{
                paddingVertical: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 14.5,
                  fontWeight: '800',
                  color: '#047857',
                }}
              >
                Continue shopping
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
