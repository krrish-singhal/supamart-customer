import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

// Outlined Poppins lettering stays in the original lockup. Never retype it.
// Additional padding reserves at least one handle-height of clear space.
export default function BrandBadge({ size = 38, showName = false, reversed = false }) {
  const height = Math.max(24, size);
  const width = showName ? Math.max(120, height * 835 / 256) : height;
  const source = showName
    ? reversed
      ? require('../../assets/branding/ms-traders-horizontal-reversed-1200.png')
      : require('../../assets/branding/ms-traders-horizontal-colour-1200.png')
    : reversed
      ? require('../../assets/branding/ms-traders-symbol-reversed-512.png')
      : require('../../assets/branding/ms-traders-symbol-small-colour-512.png');
  return (
    <View style={{ padding: height * 0.16, alignSelf: 'flex-start' }}>
      <Image source={source}
        style={{ width, height: showName ? width * 256 / 835 : height }}
        contentFit="contain" accessibilityLabel="MS Traders" accessible />
    </View>
  );
}
