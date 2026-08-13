import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

// Real GPay/PhonePe/Paytm logos, bundled locally (assets/images) — squarish chip housing,
// sized to match the rounded-2xl rows they sit inside on PaymentScreen.
function LogoChip({ source }) {
  return (
    <View
      style={{
        width: 64,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
      }}
    >
      <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </View>
  );
}

export function GPayBadge() {
  return <LogoChip source={require('../../../assets/images/gpay.png')} />;
}

export function PhonePeBadge() {
  return <LogoChip source={require('../../../assets/images/phonepe.png')} />;
}

export function PaytmBadge() {
  return <LogoChip source={require('../../../assets/images/paytm.png')} />;
}
