import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '../icons';

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    iconColor: '#047857',
    badgeBg: '#ecfdf5',
  },
  error: {
    Icon: AlertCircle,
    iconColor: '#dc2626',
    badgeBg: '#fef2f2',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: '#d97706',
    badgeBg: '#fffbeb',
  },
  info: {
    Icon: Info,
    iconColor: '#047857',
    badgeBg: '#ecfdf5',
  },
};

function ToastCard({ type = 'info', text1, text2, hide, onPress }) {
  const v = VARIANTS[type] || VARIANTS.info;
  const { Icon } = v;

  const handlePress = () => {
    if (onPress) onPress();
    if (hide) hide();
  };

  // Keep message concise and remove raw code or JSON dump if any leaked through
  const cleanText1 = typeof text1 === 'string'
    ? text1.replace(/(\r\n|\n|\r)/gm, ' ').trim()
    : text1;
  const cleanText2 = typeof text2 === 'string'
    ? text2.replace(/(\r\n|\n|\r)/gm, ' ').trim()
    : text2;

  return (
    <Pressable
      onPress={handlePress}
      style={{
        alignSelf: 'flex-end',
        marginRight: 16,
        width: 'auto',
        minWidth: 260,
        maxWidth: 340,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 9999,
        zIndex: 9999,
      }}
    >
      {/* Icon Badge */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: v.badgeBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={v.iconColor} strokeWidth={2.4} />
      </View>

      {/* Concise Notification Message */}
      <View style={{ flex: 1, paddingRight: 8 }}>
        {cleanText1 ? (
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: '700',
              color: '#0f172a',
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {cleanText1}
          </Text>
        ) : null}
        {cleanText2 ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: '#64748b',
              lineHeight: 16,
              marginTop: cleanText1 ? 2 : 0,
            }}
            numberOfLines={1}
          >
            {cleanText2}
          </Text>
        ) : null}
      </View>

      {/* Close button */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (hide) hide();
        }}
        hitSlop={8}
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f5f9',
        }}
      >
        <X size={13} color="#64748b" strokeWidth={2.4} />
      </Pressable>
    </Pressable>
  );
}

export const toastConfig = {
  success: (props) => <ToastCard {...props} type="success" />,
  error:   (props) => <ToastCard {...props} type="error" />,
  warning: (props) => <ToastCard {...props} type="warning" />,
  info:    (props) => <ToastCard {...props} type="info" />,
};
