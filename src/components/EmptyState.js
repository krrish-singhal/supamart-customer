import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Package, Wifi, Search, ShoppingCart, AlertCircle, Bell, Truck, Box } from './icons';
import { fonts } from '../theme/typography';

const ICONS = {
  empty:   Package,
  box:     Box,
  offline: Wifi,
  search:  Search,
  cart:    ShoppingCart,
  error:   AlertCircle,
  bell:    Bell,
  truck:   Truck,
};

export default function EmptyState({
  icon = 'empty',
  message = 'Nothing here yet',
  subtitle,
  onRetry,
  retryLabel = 'Try Again',
  style,
}) {
  const Icon = ICONS[icon] || Package;

  return (
    <View
      style={[
        {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 36,
          paddingHorizontal: 24,
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#f0fdf4',
          borderWidth: 1,
          borderColor: '#dcfce7',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={32} color="#047857" strokeWidth={1.8} />
      </View>

      <Text
        style={{
          fontFamily: fonts.bold,
          fontWeight: 'normal',
          fontSize: 16,
          color: '#0f172a',
          textAlign: 'center',
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {message}
      </Text>

      {subtitle ? (
        <Text
          style={{
            fontFamily: fonts.regular,
            fontWeight: 'normal',
            fontSize: 13,
            color: '#64748b',
            textAlign: 'center',
            maxWidth: 290,
            lineHeight: 19,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {onRetry && (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          style={{
            marginTop: 20,
            paddingHorizontal: 22,
            paddingVertical: 10,
            backgroundColor: '#047857',
            borderRadius: 12,
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.bold,
              fontWeight: 'normal',
              color: '#ffffff',
              fontSize: 13.5,
              letterSpacing: 0.2,
            }}
          >
            {retryLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
