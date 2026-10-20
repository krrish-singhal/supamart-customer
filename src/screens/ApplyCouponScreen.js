import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import { fonts } from '../theme/typography';

const DEFAULT_OFFERS = [
  {
    code: 'WELCOME50',
    tag: 'NEW',
    tagColor: '#065f46',
    title: 'Save ₹50 on your first order',
    description: 'Valid on first order above ₹199.',
    minValue: 199,
    value: 50,
    kind: 'FLAT',
  },
  {
    code: 'MSCLUB10',
    tag: 'CLUB',
    tagColor: '#1e293b',
    title: 'Extra 10% off (up to ₹60)',
    description: 'For MS Club members on any order.',
    minValue: 0,
    value: 10,
    maxDiscount: 60,
    kind: 'PERCENT',
  },
  {
    code: 'FRESH20',
    tag: 'FRESH',
    tagColor: '#4d7c0f',
    title: '₹20 off on fruits & vegetables',
    description: 'Applies to fresh items in your cart.',
    minValue: 149,
    value: 20,
    kind: 'FLAT',
  },
  {
    code: 'BULK100',
    tag: 'BULK',
    tagColor: '#b45309',
    title: 'Save ₹100 on stock-up orders',
    description: 'Valid on orders above ₹999.',
    minValue: 999,
    value: 100,
    kind: 'FLAT',
  },
];

const TAG_COLOR_MAP = {
  WELCOME50: { tag: 'NEW', color: '#065f46' },
  MSCLUB10: { tag: 'CLUB', color: '#1e293b' },
  FRESH20: { tag: 'FRESH', color: '#4d7c0f' },
  BULK100: { tag: 'BULK', color: '#b45309' },
  FLAT10OFF: { tag: 'FLAT', color: '#0891b2' },
  FIRSTORDER: { tag: 'FIRST', color: '#7c3aed' },
  TEA15: { tag: 'TEA', color: '#d97706' },
  DETERGENT20: { tag: 'HOME', color: '#2563eb' },
};

export default function ApplyCouponScreen({ navigation }) {
  const { subtotal, discount, couponCode, applyCoupon, removeCoupon } = useCart();
  const [inputCode, setInputCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [serverOffers, setServerOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // Fetch live active offers from Admin Portal / Backend
  useEffect(() => {
    let isCancelled = false;
    apiClient
      .get('/offers/active', { __skipErrorToast: true })
      .then(({ data }) => {
        if (!isCancelled && data?.items && data.items.length > 0) {
          setServerOffers(data.items);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setLoadingOffers(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const displayCartAmount = subtotal || 0;

  // Format all active offers with tags, colors, and calculated savings
  const formattedOffers = useMemo(() => {
    const rawList = serverOffers.length > 0 ? serverOffers : DEFAULT_OFFERS;
    return rawList.map((o) => {
      const code = (o.code || '').toUpperCase();
      const preset = TAG_COLOR_MAP[code];
      const tag = preset?.tag || (o.kind === 'PERCENT' ? `${o.value}%` : 'SAVE');
      const tagColor = preset?.color || (o.kind === 'PERCENT' ? '#047857' : '#0284c7');

      const headline =
        o.title ||
        (o.kind === 'PERCENT'
          ? `Save ${o.value}% off (up to ₹${o.maxDiscount || '—'})`
          : `Save ₹${o.value} on your order`);

      const terms =
        o.description ||
        (o.minValue > 0
          ? `Valid on orders above ₹${o.minValue}.`
          : 'Valid on any order.');

      const minOrder = Number(o.minValue || 0);

      const estimatedSavings =
        o.kind === 'PERCENT'
          ? Math.min(
              o.maxDiscount || 9999,
              Math.round((displayCartAmount * (Number(o.value) || 0)) / 100)
            )
          : Number(o.value) || 0;

      return {
        ...o,
        code,
        tag,
        tagColor,
        headline,
        terms,
        minOrder,
        savings: estimatedSavings,
      };
    });
  }, [serverOffers, displayCartAmount]);

  // Compute displayed savings amount for bottom bar
  const activeOffer = formattedOffers.find((o) => o.code === couponCode);
  const currentSavings = discount > 0 ? discount : activeOffer?.savings || 0;

  async function handleApply(codeToApply) {
    const code = (codeToApply || inputCode).trim().toUpperCase();
    if (!code) {
      Toast.show({ type: 'error', text1: 'Please enter a coupon code' });
      return;
    }

    setApplying(true);
    try {
      await applyCoupon(code);
    } catch {
      // Handled in context toast
    } finally {
      setApplying(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER: < Apply coupon | Your cart: ₹246 */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderColor: '#f1f5f9',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 6,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
        </Pressable>

        <View>
          <Text
            style={{
              fontFamily: fonts.extraBold,
              fontSize: 19,
              fontWeight: '900',
              color: '#0f172a',
              letterSpacing: -0.3,
            }}
          >
            Apply coupon
          </Text>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontSize: 12.5,
              fontWeight: '500',
              color: '#64748b',
              marginTop: 1,
            }}
          >
            Your cart: ₹{displayCartAmount}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: couponCode ? 100 : 40,
        }}
      >
        {/* DASHED INPUT BOX matching Image 1 */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: '#cbd5e1',
              borderStyle: 'dashed',
              height: 54,
              paddingHorizontal: 16,
              marginBottom: 22,
            }}
          >
            <TextInput
              value={inputCode}
              onChangeText={setInputCode}
              placeholder="ENTER COUPON CODE"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              autoCorrect={false}
              style={{
                flex: 1,
                fontFamily: fonts.bold,
                fontSize: 14,
                fontWeight: '700',
                color: '#0f172a',
                letterSpacing: 0.5,
              }}
            />

            <Pressable
              onPress={() => handleApply(inputCode)}
              disabled={applying || !inputCode.trim()}
              hitSlop={8}
            >
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 14,
                  fontWeight: '900',
                  color: inputCode.trim() ? '#047857' : '#94a3b8',
                  letterSpacing: 0.5,
                }}
              >
                APPLY
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* SECTION HEADER: AVAILABLE OFFERS matching Image 1 */}
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 12.5,
            fontWeight: '800',
            color: '#64748b',
            letterSpacing: 0.8,
            marginBottom: 14,
          }}
        >
          AVAILABLE OFFERS
        </Text>

        {/* OFFERS CARDS LIST matching Image 1 */}
        <View style={{ gap: 14 }}>
          {formattedOffers.map((offer, idx) => {
            const isApplied = couponCode === offer.code;
            const isLocked = offer.minOrder > 0 && displayCartAmount < offer.minOrder;
            const diff = Math.max(0, offer.minOrder - displayCartAmount);

            return (
              <Animated.View
                key={offer.code}
                entering={FadeInDown.duration(300).delay(idx * 60)}
              >
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    overflow: 'hidden',
                    flexDirection: 'row',
                    borderWidth: 1.5,
                    borderColor: isApplied ? '#059669' : '#f1f5f9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  {/* Left Vertical Ribbon matching Image 1 */}
                  <View
                    style={{
                      width: 48,
                      backgroundColor: offer.tagColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 14,
                    }}
                  >
                    <Text
                      style={{
                        transform: [{ rotate: '-90deg' }],
                        fontFamily: fonts.extraBold,
                        fontSize: 11,
                        fontWeight: '900',
                        color: '#ffffff',
                        letterSpacing: 1.5,
                      }}
                    >
                      {offer.tag}
                    </Text>
                  </View>

                  {/* Right Details Container */}
                  <View style={{ flex: 1, padding: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.extraBold,
                          fontSize: 16,
                          fontWeight: '900',
                          color: '#0f172a',
                        }}
                      >
                        {offer.code}
                      </Text>

                      {isApplied ? (
                        <Pressable
                          onPress={removeCoupon}
                          hitSlop={8}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 10,
                            paddingVertical: 4.5,
                            borderRadius: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.bold,
                              fontSize: 12,
                              fontWeight: '800',
                              color: '#047857',
                              letterSpacing: 0.3,
                            }}
                          >
                            APPLIED
                          </Text>
                          <Check
                            size={13}
                            color="#047857"
                            strokeWidth={3.2}
                            style={{ marginLeft: 3 }}
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => handleApply(offer.code)}
                          disabled={applying || isLocked}
                          hitSlop={8}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.extraBold,
                              fontSize: 13.5,
                              fontWeight: '900',
                              color: isLocked ? '#94a3b8' : '#047857',
                              letterSpacing: 0.5,
                            }}
                          >
                            APPLY
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Headline in dark green matching Image 1 */}
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#047857',
                        marginTop: 4,
                      }}
                    >
                      {offer.headline}
                    </Text>

                    {/* Terms */}
                    <Text
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 12,
                        fontWeight: '500',
                        color: '#64748b',
                        marginTop: 2,
                      }}
                    >
                      {offer.terms}
                    </Text>

                    {/* Locked notice for BULK100 matching Image 1 */}
                    {isLocked && (
                      <Text
                        style={{
                          fontFamily: fonts.bold,
                          fontSize: 12.5,
                          fontWeight: '700',
                          color: '#b45309',
                          marginTop: 6,
                        }}
                      >
                        Add ₹{diff} more to unlock
                      </Text>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM DIV: When coupon is applied matching Image 1 */}
      {Boolean(couponCode) && (
        <Animated.View
          entering={FadeInUp.duration(260)}
          style={{
            position: 'absolute',
            bottom: 12,
            left: 16,
            right: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#065f46',
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#065f46',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.28,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            {/* Left Col: [COUPON] applied & You save ₹XX */}
            <View>
              <Text
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 12.5,
                  fontWeight: '500',
                  color: '#a7f3d0',
                }}
              >
                {couponCode} applied
              </Text>
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontSize: 18,
                  fontWeight: '900',
                  color: '#ffffff',
                  marginTop: 2,
                }}
              >
                You save ₹{currentSavings}
              </Text>
            </View>

            {/* Right: Back to cart > button */}
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontSize: 15,
                  fontWeight: '800',
                  color: '#ffffff',
                }}
              >
                Back to cart
              </Text>
              <ChevronRight
                size={18}
                color="#ffffff"
                strokeWidth={2.8}
                style={{ marginLeft: 3 }}
              />
            </Pressable>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
