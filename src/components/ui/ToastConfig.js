import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react-native';

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
    borderColor: 'rgba(22,163,74,0.2)',
    accentColor: '#16a34a',
    bg: 'rgba(240,253,244,0.96)',
    textColor: '#14532d',
  },
  error: {
    Icon: XCircle,
    iconColor: '#dc2626',
    iconBg: 'rgba(220,38,38,0.1)',
    borderColor: 'rgba(220,38,38,0.2)',
    accentColor: '#dc2626',
    bg: 'rgba(254,242,242,0.96)',
    textColor: '#7f1d1d',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: '#d97706',
    iconBg: 'rgba(217,119,6,0.1)',
    borderColor: 'rgba(217,119,6,0.2)',
    accentColor: '#d97706',
    bg: 'rgba(255,251,235,0.96)',
    textColor: '#78350f',
  },
  info: {
    Icon: Info,
    iconColor: '#2563eb',
    iconBg: 'rgba(37,99,235,0.1)',
    borderColor: 'rgba(37,99,235,0.2)',
    accentColor: '#2563eb',
    bg: 'rgba(239,246,255,0.96)',
    textColor: '#1e3a5f',
  },
};

function ToastCard({ type = 'info', text1, text2 }) {
  const v = VARIANTS[type] || VARIANTS.info;
  const { Icon } = v;

  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify().damping(20).stiffness(220)}
      exiting={FadeOutUp.duration(180)}
      style={{
        alignSelf: 'flex-end',
        marginRight: 16,
        marginLeft: 64,
        backgroundColor: v.bg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: v.borderColor,
        borderLeftWidth: 3.5,
        borderLeftColor: v.accentColor,
        paddingVertical: 11,
        paddingRight: 14,
        paddingLeft: 11,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: v.accentColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 12,
        minWidth: 240,
        maxWidth: 320,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: v.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={v.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        {text1 ? (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: v.textColor,
              lineHeight: 18,
              marginBottom: text2 ? 2 : 0,
            }}
            numberOfLines={2}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: '#64748b',
              lineHeight: 16,
            }}
            numberOfLines={2}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const toastConfig = {
  success: (props) => <ToastCard {...props} type="success" />,
  error:   (props) => <ToastCard {...props} type="error" />,
  warning: (props) => <ToastCard {...props} type="warning" />,
  info:    (props) => <ToastCard {...props} type="info" />,
};
