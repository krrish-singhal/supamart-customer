import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Check, ChevronRight } from '../components/icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import { fonts } from '../theme/typography';

const COUPON_PRIORITY = ['TEA15', 'DETERGENT20', 'BULK100', 'FIRSTORDER', 'MSCLUB10', 'WELCOME50', 'FRESH20', 'FLAT10OFF'];

const DEFAULT_OFFERS = [
  {
    code: 'TEA15',
    tag: 'TEA',
    tagColor: '#d97706',
    title: '15% Off Tea & Beverages',
    description: 'Save 15% (up to ₹80) on tea and hot beverages.',
    minValue: 0,
    value: 15,
    maxDiscount: 80,
    kind: 'PERCENT',
  },
  {
    code: 'DETERGENT20',
    tag: 'HOME',
    tagColor: '#2563eb',
    title: '20% Off Detergent',
    description: 'Save 20% (up to ₹100) on detergents and laundry care.',
    minValue: 0,
    value: 20,
    maxDiscount: 100,
    kind: 'PERCENT',
  },
  {
    code: 'BULK100',
    tag: 'BULK',
    tagColor: '#b45309',
    title: 'Monthly Stock-Up Saver',
    description: 'Save ₹100 on bulk stock-up orders above ₹999.',
    minValue: 999,
    value: 100,
    kind: 'FLAT',
  },
  {
    code: 'FIRSTORDER',
    tag: 'FIRST',
    tagColor: '#7c3aed',
    title: 'First Order Special',
    description: 'Flat ₹100 off on your order above ₹500.',
    minValue: 500,
    value: 100,
    kind: 'FLAT',
  },
  {
    code: 'MSCLUB10',
    tag: 'CLUB',
    tagColor: '#1e293b',
    title: 'MS Club Discount',
    description: 'Extra 10% off (up to ₹60) for Club members.',
    minValue: 0,
    value: 10,
    maxDiscount: 60,
    kind: 'PERCENT',
  },
  {
    code: 'WELCOME50',
    tag: 'NEW',
    tagColor: '#065f46',
    title: 'Welcome Offer',
    description: 'Save ₹50 on your first order above ₹199.',
    minValue: 199,
    value: 50,
    kind: 'FLAT',
  },
  {
    code: 'FRESH20',
    tag: 'FRESH',
    tagColor: '#4d7c0f',
    title: 'Fresh Harvest Offer',
    description: '₹20 off on orders above ₹149.',
    minValue: 149,
    value: 20,
    kind: 'FLAT',
  },
  {
    code: 'FLAT10OFF',
    tag: 'FLAT',
    tagColor: '#0891b2',
    title: 'Everyday Savings',
    description: 'Flat ₹10 off on orders above ₹100.',
    minValue: 100,
    value: 10,
    kind: 'FLAT',
  },
];

const TAG_COLOR_MAP = {
  TEA15: { tag: 'TEA', color: '#d97706' },
  DETERGENT20: { tag: 'HOME', color: '#2563eb' },
  BULK100: { tag: 'BULK', color: '#b45309' },
  FIRSTORDER: { tag: 'FIRST', color: '#7c3aed' },
  MSCLUB10: { tag: 'CLUB', color: '#1e293b' },
  WELCOME50: { tag: 'NEW', color: '#065f46' },
  FRESH20: { tag: 'FRESH', color: '#4d7c0f' },
  FLAT10OFF: { tag: 'FLAT', color: '#0891b2' },
  FLAT100OFF: { tag: 'FLAT', color: '#0891b2' },
};

export default function ApplyCouponScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { subtotal, discount, couponCode, applyCoupon, removeCoupon } = useCart();
  const [inputCode, setInputCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [serverOffers, setServerOffers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/offers/active', { __skipErrorToast: true });
      if (data?.items && data.items.length > 0) {
        setServerOffers(data.items);
      }
    } catch (_) {}
  }, []);

  // Fetch live active offers from Admin Portal / Backend on focus
  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      fetchOffers().then(() => {});

      return () => {
        isCancelled = true;
      };
    }, [fetchOffers])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOffers();
    setRefreshing(false);
  }, [fetchOffers]);

  const displayCartAmount = subtotal || 0;

  // Format all active offers with tags, colors, and calculated savings with deterministic ordering
  const formattedOffers = useMemo(() => {
    const rawList = serverOffers.length > 0 ? serverOffers : DEFAULT_OFFERS;
    const sorted = [...rawList].sort((a, b) => {
      const codeA = (a.code || '').toUpperCase();
      const codeB = (b.code || '').toUpperCase();
      const idxA = COUPON_PRIORITY.indexOf(codeA);
      const idxB = COUPON_PRIORITY.indexOf(codeB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return codeA.localeCompare(codeB);
    });

    return sorted.map((o) => {
      const code = (o.code || '').toUpperCase();
      const isUsed = Boolean(o.isUsed || o.alreadyUsed);
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
        isUsed,
        alreadyUsed: isUsed,
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

      {/* TOP HEADER: < Apply coupon | Your cart: ₹XXX */}
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
            marginRight: 8,
          }}
        >
          <ChevronLeft size={24} color="#0f172a" strokeWidth={2.6} />
        </Pressable>

        <View>
          <Text
            style={{
              fontFamily: fonts.extraBold,
              fontWeight: 'normal',
              fontSize: 19,
              color: '#0f172a',
              letterSpacing: -0.3,
            }}
          >
            Apply coupon
          </Text>
          <Text
            style={{
              fontFamily: fonts.medium,
              fontWeight: 'normal',
              fontSize: 12.5,
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#047857']}
            tintColor="#047857"
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: couponCode
            ? Math.max(insets.bottom + 96, 120)
            : Math.max(insets.bottom + 32, 48),
        }}
      >
        {/* DASHED INPUT BOX */}
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
            marginBottom: 20,
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
              fontWeight: 'normal',
              fontSize: 14,
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
                fontWeight: 'normal',
                fontSize: 14,
                color: inputCode.trim() ? '#047857' : '#94a3b8',
                letterSpacing: 0.5,
              }}
            >
              APPLY
            </Text>
          </Pressable>
        </View>

        {/* SECTION HEADER: AVAILABLE OFFERS */}
        <Text
          style={{
            fontFamily: fonts.bold,
            fontWeight: 'normal',
            fontSize: 12.5,
            color: '#64748b',
            letterSpacing: 0.8,
            marginBottom: 12,
            textTransform: 'uppercase',
          }}
        >
          Available Offers
        </Text>

        {/* OFFERS CARDS LIST — Pure, high-performance Views without Reanimated layout overlap glitches */}
        <View>
          {formattedOffers.map((offer) => {
            const isApplied = couponCode === offer.code;
            const isUsed = Boolean(offer.isUsed || offer.alreadyUsed);
            const isLocked = isUsed || (offer.minOrder > 0 && displayCartAmount < offer.minOrder);
            const diff = Math.max(0, offer.minOrder - displayCartAmount);

            return (
              <View
                key={offer.code}
                style={{
                  marginBottom: 14,
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  flexDirection: 'row',
                  borderWidth: isApplied ? 2 : 1.5,
                  borderColor: isApplied ? '#059669' : '#f1f5f9',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 5,
                  elevation: 2,
                  opacity: isUsed ? 0.75 : 1,
                }}
              >
                {/* Left Vertical Ribbon */}
                <View
                  style={{
                    width: 48,
                    backgroundColor: isUsed ? '#94a3b8' : offer.tagColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 14,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      transform: [{ rotate: '-90deg' }],
                      fontFamily: fonts.extraBold,
                      fontWeight: 'normal',
                      fontSize: 11,
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
                        fontWeight: 'normal',
                        fontSize: 16,
                        color: isUsed ? '#64748b' : '#0f172a',
                        letterSpacing: 0.3,
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
                            fontWeight: 'normal',
                            fontSize: 12,
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
                    ) : isUsed ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#f1f5f9',
                          paddingHorizontal: 10,
                          paddingVertical: 4.5,
                          borderRadius: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.bold,
                            fontWeight: 'normal',
                            fontSize: 12,
                            color: '#94a3b8',
                            letterSpacing: 0.3,
                          }}
                        >
                          ALREADY USED
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleApply(offer.code)}
                        disabled={applying || isLocked}
                        hitSlop={8}
                      >
                        <Text
                          style={{
                            fontFamily: fonts.extraBold,
                            fontWeight: 'normal',
                            fontSize: 13.5,
                            color: isLocked ? '#94a3b8' : '#047857',
                            letterSpacing: 0.5,
                          }}
                        >
                          APPLY
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Headline in dark green */}
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontWeight: 'normal',
                      fontSize: 14,
                      color: isUsed ? '#64748b' : '#047857',
                      marginTop: 4,
                    }}
                  >
                    {offer.headline}
                  </Text>

                  {/* Terms */}
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontWeight: 'normal',
                      fontSize: 12,
                      color: '#64748b',
                      marginTop: 2,
                      lineHeight: 17,
                    }}
                  >
                    {offer.terms}
                  </Text>

                  {/* Locked notice for BULK100 or already used */}
                  {isUsed ? (
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontWeight: 'normal',
                        fontSize: 12,
                        color: '#dc2626',
                        marginTop: 6,
                      }}
                    >
                      • Already redeemed on a previous order (single use only)
                    </Text>
                  ) : isLocked && diff > 0 ? (
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontWeight: 'normal',
                        fontSize: 12,
                        color: '#b45309',
                        marginTop: 6,
                      }}
                    >
                      Add ₹{diff} more to unlock
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM DIV: When coupon is applied */}
      {Boolean(couponCode) && (
        <Animated.View
          entering={FadeInUp.duration(260)}
          style={{
            position: 'absolute',
            bottom: Math.max(insets.bottom, 14),
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
                  fontWeight: 'normal',
                  fontSize: 12.5,
                  color: '#a7f3d0',
                }}
              >
                {couponCode} applied
              </Text>
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontWeight: 'normal',
                  fontSize: 18,
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
                  fontWeight: 'normal',
                  fontSize: 15,
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
