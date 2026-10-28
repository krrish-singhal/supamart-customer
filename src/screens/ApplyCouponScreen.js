import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Check, ChevronRight } from '../components/icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { useCart } from '../context/CartContext';
import { fonts } from '../theme/typography';

const DEFAULT_OFFERS = [
  {
    code: 'WELCOME50',
    tag: 'NEW',
    tagColor: '#0a7c47',
    title: 'Save ₹50 on your first order',
    description: 'Valid on first order above ₹199.',
    minValue: 199,
    value: 50,
    kind: 'FLAT',
    sortOrder: 1,
  },
  {
    code: 'MSCLUB10',
    tag: 'CLUB',
    tagColor: '#121712',
    title: 'Extra 10% off (up to ₹60)',
    description: 'For MS Club members on any order.',
    minValue: 0,
    value: 10,
    maxDiscount: 60,
    kind: 'PERCENT',
    sortOrder: 2,
  },
  {
    code: 'FRESH20',
    tag: 'FRESH',
    tagColor: '#4e8a3e',
    title: '₹20 off on fruits & vegetables',
    description: 'Applies to fresh items in your cart.',
    minValue: 0,
    value: 20,
    kind: 'FLAT',
    sortOrder: 3,
  },
  {
    code: 'BULK100',
    tag: 'BULK',
    tagColor: '#b57a00',
    title: 'Save ₹100 on stock-up orders',
    description: 'Valid on orders above ₹999.',
    minValue: 999,
    value: 100,
    kind: 'FLAT',
    sortOrder: 4,
  },
  {
    code: 'FLAT10OFF',
    tag: 'FLAT',
    tagColor: '#0891b2',
    title: 'Flat ₹10 off on orders',
    description: 'Valid on orders above ₹100.',
    minValue: 100,
    value: 10,
    kind: 'FLAT',
    sortOrder: 5,
  },
  {
    code: 'FIRSTORDER',
    tag: 'FIRST',
    tagColor: '#7c3aed',
    title: 'Flat ₹100 off on your first order',
    description: 'Valid on orders above ₹500.',
    minValue: 500,
    value: 100,
    kind: 'FLAT',
    sortOrder: 6,
  },
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
    sortOrder: 7,
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
    sortOrder: 8,
  },
];

const TAG_COLOR_MAP = {
  WELCOME50: { tag: 'NEW', color: '#0a7c47' },
  MSCLUB10: { tag: 'CLUB', color: '#121712' },
  FRESH20: { tag: 'FRESH', color: '#4e8a3e' },
  BULK100: { tag: 'BULK', color: '#b57a00' },
  FLAT10OFF: { tag: 'FLAT', color: '#0891b2' },
  FIRSTORDER: { tag: 'FIRST', color: '#7c3aed' },
  TEA15: { tag: 'TEA', color: '#d97706' },
  DETERGENT20: { tag: 'HOME', color: '#2563eb' },
};

// Memoized Offer Card: Isolated from text input re-renders for buttery 60fps performance
const OfferCard = React.memo(function OfferCard({
  offer,
  isApplied,
  isLocked,
  diff,
  isApplying,
  onApply,
  onRemove,
}) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        borderWidth: isApplied ? 1.5 : 1,
        borderColor: isApplied ? '#0a7c47' : '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      {/* Left Vertical Ribbon */}
      <View
        style={{
          width: 46,
          backgroundColor: offer.tagColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderTopLeftRadius: 15,
          borderBottomLeftRadius: 15,
        }}
      >
        <Text
          style={{
            transform: [{ rotate: '-90deg' }],
            fontFamily: fonts.extraBold,
            fontWeight: 'normal',
            fontSize: 11,
            color: '#ffffff',
            letterSpacing: 1.5,
            includeFontPadding: false,
          }}
        >
          {offer.tag}
        </Text>
      </View>

      {/* Right Details Container */}
      <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14 }}>
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
              fontSize: 15.5,
              color: '#0f172a',
            }}
          >
            {offer.code}
          </Text>

          {isApplied ? (
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#d6eade',
                paddingHorizontal: 9,
                paddingVertical: 4.5,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.bold,
                  fontWeight: 'normal',
                  fontSize: 11.5,
                  color: '#0a7c47',
                  letterSpacing: 0.3,
                  marginRight: 4,
                }}
              >
                APPLIED
              </Text>
              <Check
                size={12}
                color="#0a7c47"
                strokeWidth={3}
              />
            </Pressable>
          ) : isLocked ? null : (
            <Pressable
              onPress={() => onApply(offer.code)}
              disabled={isApplying}
              hitSlop={8}
              style={{ minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
            >
              {isApplying ? (
                <ActivityIndicator size="small" color="#0a7c47" />
              ) : (
                <Text
                  style={{
                    fontFamily: fonts.extraBold,
                    fontWeight: 'normal',
                    fontSize: 13.5,
                    color: '#0a7c47',
                    letterSpacing: 0.5,
                  }}
                >
                  APPLY
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Headline in rich green */}
        <Text
          style={{
            fontFamily: fonts.bold,
            fontWeight: 'normal',
            fontSize: 13.5,
            color: '#0b7d48',
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
          }}
        >
          {offer.terms}
        </Text>

        {/* Locked notice for BULK100 matching reference design */}
        {isLocked && (
          <Text
            style={{
              fontFamily: fonts.bold,
              fontWeight: 'normal',
              fontSize: 12,
              color: '#9a6400',
              marginTop: 6,
            }}
          >
            Add ₹{diff} more to unlock
          </Text>
        )}
      </View>
    </View>
  );
});

export default function ApplyCouponScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { subtotal, discount, couponCode, applyCoupon, removeCoupon } = useCart();
  const [inputCode, setInputCode] = useState('');
  const [applyingCode, setApplyingCode] = useState(null);
  const [serverOffers, setServerOffers] = useState([]);

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
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  const displayCartAmount = subtotal || 0;

  // Format all active offers with tags, colors, and calculated savings
  const formattedOffers = useMemo(() => {
    const rawList = serverOffers.length > 0 ? serverOffers : DEFAULT_OFFERS;

    // Prioritize by sortOrder from DB, then reference offers
    const priority = ['WELCOME50', 'MSCLUB10', 'FRESH20', 'BULK100'];
    const sorted = [...rawList].sort((a, b) => {
      const codeA = (a.code || '').toUpperCase();
      const codeB = (b.code || '').toUpperCase();
      const orderA = a.sortOrder != null ? Number(a.sortOrder) : (priority.indexOf(codeA) !== -1 ? priority.indexOf(codeA) + 1 : 999);
      const orderB = b.sortOrder != null ? Number(b.sortOrder) : (priority.indexOf(codeB) !== -1 ? priority.indexOf(codeB) + 1 : 999);
      if (orderA !== orderB) return orderA - orderB;
      return 0;
    });

    return sorted.map((o) => {
      const code = (o.code || '').toUpperCase();
      const preset = TAG_COLOR_MAP[code];
      const tag = o.tag || preset?.tag || (o.kind === 'PERCENT' ? `${o.value}%` : 'SAVE');
      const tagColor = o.tagColor || preset?.color || (o.kind === 'PERCENT' ? '#0a7c47' : '#0284c7');

      const headline =
        o.title ||
        (o.kind === 'PERCENT'
          ? `Extra ${o.value}% off (up to ₹${o.maxDiscount || '—'})`
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

  const handleApply = useCallback(
    async (codeToApply) => {
      const code = (codeToApply || inputCode).trim().toUpperCase();
      if (!code) {
        Toast.show({ type: 'error', text1: 'Please enter a coupon code' });
        return;
      }

      setApplyingCode(code);
      try {
        await applyCoupon(code);
        if (codeToApply === inputCode) {
          setInputCode('');
        }
      } catch {
        // Error toast handled cleanly in CartContext
      } finally {
        setApplyingCode(null);
      }
    },
    [inputCode, applyCoupon]
  );

  const isInputApplying = applyingCode === inputCode.trim().toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f5f2' }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER CONTAINER (WHITE BACKGROUND): < Apply coupon + Cart Total + Dashed Coupon Box */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderColor: '#e5e7eb',
        }}
      >
        {/* Title Row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <ChevronLeft size={22} color="#0f172a" strokeWidth={2.4} />
          </Pressable>

          <View>
            <Text
              style={{
                fontFamily: fonts.extraBold,
                fontWeight: 'normal',
                fontSize: 18,
                color: '#0f172a',
                letterSpacing: -0.2,
              }}
            >
              Apply coupon
            </Text>
            <Text
              style={{
                fontFamily: fonts.medium,
                fontWeight: 'normal',
                fontSize: 12,
                color: '#64748b',
                marginTop: 1,
              }}
            >
              Your cart: ₹{displayCartAmount}
            </Text>
          </View>
        </View>

        {/* Dashed Input Row inside the White Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            borderWidth: 1.2,
            borderColor: '#94a3b8',
            borderStyle: 'dashed',
            height: 48,
            paddingHorizontal: 14,
          }}
        >
          <TextInput
            value={inputCode}
            onChangeText={setInputCode}
            placeholder="ENTER COUPON CODE"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            autoCorrect={false}
            style={{
              flex: 1,
              fontFamily: fonts.bold,
              fontWeight: 'normal',
              fontSize: 13.5,
              color: '#0f172a',
              letterSpacing: 0.5,
              paddingVertical: 0,
            }}
          />

          <Pressable
            onPress={() => handleApply(inputCode)}
            disabled={Boolean(applyingCode) || !inputCode.trim()}
            hitSlop={8}
            style={{ minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            {isInputApplying ? (
              <ActivityIndicator size="small" color="#0a7c47" />
            ) : (
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontWeight: 'normal',
                  fontSize: 13.5,
                  color: inputCode.trim() ? '#0a7c47' : '#94a3b8',
                  letterSpacing: 0.5,
                }}
              >
                APPLY
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* OFFERS LIST ON SOFT GREY/GREEN BACKGROUND */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: couponCode ? Math.max(insets.bottom + 85, 105) : Math.max(insets.bottom + 24, 40),
        }}
      >
        {/* SECTION HEADER: AVAILABLE OFFERS */}
        <Text
          style={{
            fontFamily: fonts.bold,
            fontWeight: 'normal',
            fontSize: 12.5,
            color: '#64748b',
            letterSpacing: 0.8,
            marginBottom: 12,
          }}
        >
          AVAILABLE OFFERS
        </Text>

        {/* OFFERS CARDS LIST */}
        <View style={{ gap: 14 }}>
          {formattedOffers.map((offer) => {
            const isApplied = couponCode === offer.code;
            const isLocked = offer.minOrder > 0 && displayCartAmount < offer.minOrder;
            const diff = Math.max(0, offer.minOrder - displayCartAmount);
            const isApplying = applyingCode === offer.code;

            return (
              <OfferCard
                key={offer.code}
                offer={offer}
                isApplied={isApplied}
                isLocked={isLocked}
                diff={diff}
                isApplying={isApplying}
                onApply={handleApply}
                onRemove={removeCoupon}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* BOTTOM FLOATING BAR: When coupon is applied matching Image 2 */}
      {Boolean(couponCode) && (
        <Animated.View
          entering={FadeInUp.duration(200)}
          style={{
            position: 'absolute',
            bottom: Math.max(insets.bottom, 14),
            left: 16,
            right: 16,
          }}
        >
          <View
            style={{
              backgroundColor: '#0a7c47',
              borderRadius: 16,
              paddingVertical: 13,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#0a7c47',
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
                  fontFamily: fonts.medium,
                  fontWeight: 'normal',
                  fontSize: 12,
                  color: '#d1fae5',
                }}
              >
                {couponCode} applied
              </Text>
              <Text
                style={{
                  fontFamily: fonts.extraBold,
                  fontWeight: 'normal',
                  fontSize: 16.5,
                  color: '#ffffff',
                  marginTop: 1,
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
                  fontSize: 14.5,
                  color: '#ffffff',
                }}
              >
                Back to cart
              </Text>
              <ChevronRight
                size={16}
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
