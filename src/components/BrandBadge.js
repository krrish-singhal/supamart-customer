import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

// Official app wordmark & brand badge using system logo.png
export default function BrandBadge({ size = 38, showName = false }) {
  const borderRadius = Math.round(size * 0.28);
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: '92%', height: '92%' }}
          contentFit="contain"
        />
      </View>
      {showName && <Text style={styles.name}>MS Traders</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  badge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  name: {
    fontFamily: 'Inter-Bold',
    fontWeight: 'normal',
    fontSize: 18,
    color: '#0f172a',
    letterSpacing: -0.4,
  },
});

