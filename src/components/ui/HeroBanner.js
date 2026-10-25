import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from '../icons';
import { fonts } from '../../theme/typography';

export const HOME_BANNERS = [
  { label: 'Farm fresh', title: 'Vegetables picked this morning', subtitle: 'Starting at just ₹9', background: '#E4F2E9', text: '#121712', secondary: '#3B5145', button: '#0A7C47', buttonText: '#FFFFFF', image: require('../../../assets/images/banner_collage_fresh.webp'), destination: 'categories' },
  { label: 'Monthly ration', title: 'Wholesale prices, home delivered', subtitle: 'Up to 20% off atta, rice & oil', background: '#0A7C47', text: '#FFFFFF', secondary: '#D1FAE5', button: '#FFFFFF', buttonText: '#0A7C47', image: require('../../../assets/images/banner_collage_ration.webp'), destination: 'offers' },
  { label: 'Tea time', title: 'Tea, biscuits & snacks', subtitle: 'Buy 2, get 10% extra off', background: '#1E2B23', text: '#FFFFFF', secondary: '#CBD5E1', button: '#FFFFFF', buttonText: '#0A7C47', image: require('../../../assets/images/banner_collage_teatime.webp'), destination: 'categories' },
];

export default function HeroBanner({ banner, width, onPress }) {
  const { fontScale } = useWindowDimensions();
  const stacked = width < 320 || fontScale > 1.2;
  return (
    <View style={{ width, minHeight: 200, borderRadius: 22, backgroundColor: banner.background, padding: 16, flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', gap: 12 }}>
      <View style={{ flex: stacked ? undefined : 1, minWidth: 0, gap: 6 }}>
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 10.5, color: banner.secondary, letterSpacing: 0.8, textTransform: 'uppercase' }}>{banner.label}</Text>
        <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 24, color: banner.text }}>{banner.title}</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: banner.secondary }}>{banner.subtitle}</Text>
        <Pressable onPress={onPress} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4, borderRadius: 24, backgroundColor: banner.button, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 12.5, color: banner.buttonText }}>Shop now</Text>
          <ChevronRight size={16} color={banner.buttonText} />
        </Pressable>
      </View>
      <Image source={banner.image} contentFit="contain" style={{ width: stacked ? '100%' : Math.min(150, width * 0.33), height: stacked ? 80 : 100, flexShrink: 0 }} />
    </View>
  );
}
