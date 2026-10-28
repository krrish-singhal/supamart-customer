import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Star,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
} from './icons';
import Toast from 'react-native-toast-message';
import apiClient from '../services/api';
import { fonts } from '../theme/typography';
import { getProductImageSource } from '../utils/productImages';

function StarRatingRow({ value, onChange, size = 22, disabled = false }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= value;
        return (
          <Pressable
            key={star}
            disabled={disabled}
            hitSlop={6}
            onPress={() => onChange(star)}
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            accessibilityState={{ selected: isFilled }}
          >
            <Star
              size={size}
              color={isFilled ? '#eab308' : '#cbd5e1'}
              fill={isFilled ? '#facc15' : 'transparent'}
              strokeWidth={1.8}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function OrderRatings({ order, onDismiss, inModal = false }) {
  const [orderRating, setOrderRating] = useState(
    order.ratings?.orderRating || order.deliveryRating || 0
  );
  const [productRatings, setProductRatings] = useState(
    Object.fromEntries(
      (order.ratings?.productRatings || []).map((item) => [item.productId, item.rating])
    )
  );
  const [deliveryFeedback, setDeliveryFeedback] = useState(null); // 'up' | 'down' | null
  const [review, setReview] = useState(order.ratings?.review || '');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const products = [
    ...new Map((order.items || []).map((item) => [item.productId || item.id, item])).values(),
  ];

  // Delivery status formatting
  const orderNumber = order.orderNo || order.id?.slice(-5) || '10482';
  const itemCount = order.items?.length || 0;
  const totalAmount = Number(order.total || order.totalAmount || order.pricing?.total || order.finalToPay || 0);
  const partnerName = order.deliveryPartnerName || order.driverName || 'Delivery partner';
  const partnerInitial = partnerName.trim().charAt(0).toUpperCase() || 'D';

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  const handleSave = async () => {
    if (!orderRating || busy) return;
    setBusy(true);
    try {
      await apiClient.patch(`/orders/${order.id || order.orderNo}/ratings`, {
        orderRating,
        review,
        productRatings: Object.entries(productRatings).map(([productId, rating]) => ({
          productId,
          rating,
        })),
        deliveryFeedback,
      });
      Toast.show({ type: 'success', text1: 'Thanks! Your ratings have been saved.' });
      setDismissed(true);
      if (onDismiss) onDismiss();
    } catch (err) {
      console.error('Submit rating error:', err.response?.data || err.message);
      Toast.show({
        type: 'error',
        text1: err.response?.data?.error || 'Failed to submit rating. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = orderRating > 0;

  return (
    <View style={[styles.container, inModal && styles.containerInModal]}>
      {/* Top Bar matching Image 5 */}
      <View style={styles.topBar}>
        <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
          <X size={20} color="#0f172a" strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.topTitle}>Rate your order</Text>
        <Pressable onPress={handleDismiss} hitSlop={10} style={styles.notNowBtn}>
          <Text style={styles.notNowText}>Not now</Text>
        </Pressable>
      </View>

      {/* Delivered Status Banner */}
      <View style={styles.deliveredBanner}>
        <View style={styles.deliveredCheckBadge}>
          <Check size={16} color="#ffffff" strokeWidth={3} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deliveredTitle}>
            Delivered {order.deliveredAt ? 'recently' : 'today, 5:42 PM'}
          </Text>
          <Text style={styles.deliveredSubtitle}>
            Order #{orderNumber} · {itemCount} item{itemCount !== 1 ? 's' : ''} · ₹{Math.round(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Card 1: How was your order? */}
      <View style={styles.card}>
        <Text style={styles.cardTitleCentered}>How was your order?</Text>
        <View style={styles.centerStarsWrap}>
          <StarRatingRow
            value={orderRating}
            onChange={setOrderRating}
            size={36}
            disabled={busy}
          />
        </View>
        <Text style={styles.tapToRateText}>
          {orderRating === 0
            ? 'Tap to rate'
            : orderRating === 5
            ? 'Excellent!'
            : orderRating === 4
            ? 'Very Good'
            : orderRating === 3
            ? 'Good'
            : orderRating === 2
            ? 'Fair'
            : 'Needs improvement'}
        </Text>
      </View>

      {/* Card 2: Rate the products */}
      {products.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rate the products</Text>
          <Text style={styles.cardSubtitle}>Helps us stock what you love</Text>

          <View style={styles.productList}>
            {products.map((item, index) => {
              const currentRating = productRatings[item.productId] || 0;
              const imageSrc = getProductImageSource(item);

              return (
                <View
                  key={item.productId || index}
                  style={[
                    styles.productRow,
                    index < products.length - 1 && styles.productDivider,
                  ]}
                >
                  <Image
                    source={imageSrc}
                    style={styles.productThumb}
                    contentFit="cover"
                  />
                  <View style={styles.productInfo}>
                    <Text numberOfLines={1} style={styles.productName}>
                      {item.name}
                    </Text>
                    <StarRatingRow
                      value={currentRating}
                      onChange={(rating) =>
                        setProductRatings((prev) => ({
                          ...prev,
                          [item.productId]: rating,
                        }))
                      }
                      size={20}
                      disabled={busy}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Card 3: How was the delivery? */}
      <View style={styles.card}>
        <View style={styles.deliveryPartnerRow}>
          <View style={styles.partnerAvatar}>
            <Text style={styles.partnerAvatarText}>{partnerInitial}</Text>
          </View>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.deliveryTitle}>How was the delivery?</Text>
            <Text style={styles.deliverySubtitle}>{partnerName}</Text>
          </View>

          <View style={styles.thumbsContainer}>
            <Pressable
              onPress={() =>
                setDeliveryFeedback((prev) => (prev === 'up' ? null : 'up'))
              }
              style={[
                styles.thumbBtn,
                deliveryFeedback === 'up' && styles.thumbBtnActive,
              ]}
              hitSlop={6}
            >
              <ThumbsUp
                size={18}
                color={deliveryFeedback === 'up' ? '#047857' : '#64748b'}
                strokeWidth={2.2}
              />
            </Pressable>

            <Pressable
              onPress={() =>
                setDeliveryFeedback((prev) => (prev === 'down' ? null : 'down'))
              }
              style={[
                styles.thumbBtn,
                deliveryFeedback === 'down' && styles.thumbBtnActiveRed,
              ]}
              hitSlop={6}
            >
              <ThumbsDown
                size={18}
                color={deliveryFeedback === 'down' ? '#dc2626' : '#64748b'}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Optional feedback input if rated */}
      {orderRating > 0 && (
        <View style={styles.card}>
          <TextInput
            placeholder="Tell us more about your experience (optional)"
            placeholderTextColor="#94a3b8"
            value={review}
            onChangeText={setReview}
            maxLength={400}
            multiline
            style={styles.reviewInput}
          />
        </View>
      )}

      {/* Bottom Action Button */}
      <Pressable
        disabled={!canSubmit || busy}
        onPress={handleSave}
        style={[
          styles.submitBtn,
          !canSubmit && styles.submitBtnDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text
            style={[
              styles.submitBtnText,
              !canSubmit && styles.submitBtnTextDisabled,
            ]}
          >
            {canSubmit ? 'Submit rating' : 'Tap a star to rate'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f6f8f6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#edf2ed',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  containerInModal: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 0,
    marginBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  closeBtn: {
    padding: 4,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0f172a',
  },
  notNowBtn: {
    padding: 4,
  },
  notNowText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#047857',
  },
  deliveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf6ee',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  deliveredCheckBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deliveredTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0f172a',
  },
  deliveredSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2ed',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0f172a',
  },
  cardTitleCentered: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 14,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  centerStarsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tapToRateText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  productList: {
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#0f172a',
  },
  deliveryPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  deliveryTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#0f172a',
  },
  deliverySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  thumbsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBtnActive: {
    borderColor: '#047857',
    backgroundColor: '#ecfdf5',
  },
  thumbBtnActiveRed: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  reviewInput: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 58,
    textAlignVertical: 'top',
    padding: 0,
  },
  submitBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  submitBtnTextDisabled: {
    color: '#94a3b8',
  },
});
