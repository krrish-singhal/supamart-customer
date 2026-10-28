import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from '../icons';
import { fonts } from '../../theme/typography';

export const HOME_BANNERS = [
  {
    id: 'local-1',
    label: 'Farm fresh',
    title: 'Vegetables picked this morning',
    subtitle: 'Starting at just ₹9',
    background: '#E4F2E9',
    text: '#121712',
    secondary: '#3B5145',
    button: '#0A7C47',
    buttonText: 'Shop now',
    buttonTextColor: '#FFFFFF',
    image: require('../../../assets/images/banner_collage_fresh.webp'),
    destination: 'categories',
    target: 'Home',
  },
  {
    id: 'local-2',
    label: 'Monthly ration',
    title: 'Wholesale prices,\nhome delivered',
    subtitle: 'Up to 20% off atta, rice & oil',
    background: '#0A7C47',
    text: '#FFFFFF',
    secondary: '#D1FAE5',
    button: '#FFFFFF',
    buttonText: 'Shop now',
    buttonTextColor: '#0A7C47',
    image: require('../../../assets/images/banner_collage_ration.webp'),
    destination: 'offers',
    target: 'Home',
  },
  {
    id: 'local-3',
    label: 'Tea time',
    title: 'Tea, biscuits & snacks',
    subtitle: 'Buy 2, get 10% extra off',
    background: '#1E2B23',
    text: '#FFFFFF',
    secondary: '#CBD5E1',
    button: '#FFFFFF',
    buttonText: 'Shop now',
    buttonTextColor: '#0A7C47',
    image: require('../../../assets/images/banner_collage_teatime.webp'),
    destination: 'categories',
    target: 'Home',
  },
];

function resolveSideImage(banner) {
  if (!banner) return null;

  // 1. Explicit sideImage
  if (banner.sideImage) {
    if (typeof banner.sideImage === 'number') return banner.sideImage;
    if (typeof banner.sideImage === 'string') return { uri: banner.sideImage };
  }

  // 2. Banner image property
  const img = banner.image;
  if (!img) return null;

  if (typeof img === 'number') {
    return img;
  }

  if (typeof img === 'string') {
    const lower = img.toLowerCase();
    const labelKey = `${banner.label || ''} ${banner.title || ''}`.toLowerCase();

    // Map known Cloudinary IDs or keywords to local high-res collages
    if (
      lower.includes('bteamttrme9ml4jnogxh') ||
      labelKey.includes('fresh') ||
      labelKey.includes('farm') ||
      labelKey.includes('vegetable')
    ) {
      return require('../../../assets/images/banner_collage_fresh.webp');
    }
    if (
      lower.includes('nyskwtfc5ntynxjlk1kn') ||
      labelKey.includes('ration') ||
      labelKey.includes('wholesale') ||
      labelKey.includes('month') ||
      labelKey.includes('atta')
    ) {
      return require('../../../assets/images/banner_collage_ration.webp');
    }
    if (
      lower.includes('ytspnwwljgmzwglejvgw') ||
      labelKey.includes('tea') ||
      labelKey.includes('biscuit') ||
      labelKey.includes('snack')
    ) {
      return require('../../../assets/images/banner_collage_teatime.webp');
    }

    if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('file:')) {
      return { uri: img };
    }
  }

  return null;
}

export default function HeroBanner({ banner, width, onPress }) {
  const { fontScale } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);

  if (!banner) return null;

  const bannerHeight = Math.max(136, Math.round(width / 2.5));
  const sideImageSource = imageError ? null : resolveSideImage(banner);

  const isFullGraphic =
    banner.mode === 'full' ||
    banner.type === 'full' ||
    banner.isFullGraphic === true ||
    (!banner.title && !banner.label && !!sideImageSource);

  // If designated as full graphic, render full-bleed banner
  if (isFullGraphic && sideImageSource) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={banner.title || banner.label || 'Home Promotional Banner'}
        style={{
          width,
          height: bannerHeight,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: banner.background || '#0A7C47',
        }}
      >
        <Image
          source={sideImageSource}
          contentFit="cover"
          cachePolicy="disk"
          onError={() => setImageError(true)}
          style={{ width: '100%', height: '100%' }}
        />
      </Pressable>
    );
  }

  // Button text and color resolution
  const btnLabel =
    typeof banner.buttonText === 'string' &&
    !banner.buttonText.startsWith('#') &&
    banner.buttonText.trim().length > 0
      ? banner.buttonText.trim()
      : 'Shop now';

  const btnBg = banner.button || '#FFFFFF';
  const isWhiteButton =
    btnBg.toUpperCase() === '#FFFFFF' ||
    btnBg.toUpperCase() === '#FFF' ||
    btnBg.toLowerCase() === 'white';

  const btnTextColor =
    banner.buttonTextColor ||
    (typeof banner.buttonText === 'string' && banner.buttonText.startsWith('#')
      ? banner.buttonText
      : isWhiteButton
      ? banner.background || '#0A7C47'
      : '#FFFFFF');

  // Side white visual box dimensions
  const cardW = Math.min(145, Math.max(110, Math.round(width * 0.40)));
  const cardH = Math.round(bannerHeight * 0.84);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${banner.title || banner.label || 'Promotional Banner'}. ${btnLabel}`}
      style={{
        width,
        height: bannerHeight,
        borderRadius: 20,
        backgroundColor: banner.background || '#0A7C47',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Left Column: Form-driven Native Typography */}
      <View
        style={{
          flex: 1,
          minWidth: 0,
          justifyContent: 'center',
          marginRight: sideImageSource ? 10 : 0,
        }}
      >
        {!!banner.label && (
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontWeight: 'normal',
              fontSize: 10.5,
              letterSpacing: 0.8,
              color: banner.secondary || '#D1FAE5',
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {banner.label}
          </Text>
        )}

        {!!banner.title && (
          <Text
            numberOfLines={2}
            style={{
              fontFamily: fonts.extraBold,
              fontWeight: 'normal',
              fontSize: 16.5,
              lineHeight: 21,
              color: banner.text || '#FFFFFF',
              marginBottom: 3,
            }}
          >
            {banner.title}
          </Text>
        )}

        {!!banner.subtitle && (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.regular,
              fontWeight: 'normal',
              fontSize: 11.5,
              lineHeight: 15,
              color: banner.secondary || '#D1FAE5',
              marginBottom: 10,
            }}
          >
            {banner.subtitle}
          </Text>
        )}

        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: btnBg,
            paddingHorizontal: 12,
            paddingVertical: 5.5,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.semiBold,
              fontWeight: 'normal',
              fontSize: 11,
              color: btnTextColor,
            }}
          >
            {btnLabel}
          </Text>
          <ChevronRight size={11} color={btnTextColor} />
        </View>
      </View>

      {/* Right Column: Floating White Product Container */}
      {!!sideImageSource && (
        <View
          style={{
            width: cardW,
            height: cardH,
            borderRadius: 16,
            backgroundColor: '#FFFFFF',
            padding: 4,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Image
            source={sideImageSource}
            contentFit="contain"
            cachePolicy="disk"
            onError={() => setImageError(true)}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      )}
    </Pressable>
  );
}
