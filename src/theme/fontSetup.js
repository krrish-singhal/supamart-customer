import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import * as ReactNative from 'react-native';

export const FONT_MAP = {
  '900': 'Inter-Black',
  black: 'Inter-Black',
  '800': 'Inter-ExtraBold',
  heavy: 'Inter-ExtraBold',
  extrabold: 'Inter-ExtraBold',
  '700': 'Inter-Bold',
  bold: 'Inter-Bold',
  '600': 'Inter-SemiBold',
  semibold: 'Inter-SemiBold',
  '500': 'Inter-Medium',
  medium: 'Inter-Medium',
  '400': 'Inter-Regular',
  normal: 'Inter-Regular',
  '300': 'Inter-Regular',
  '200': 'Inter-Regular',
  '100': 'Inter-Regular',
};

const ICON_FONTS = [
  'ionicons',
  'materialicons',
  'material icons',
  'fontawesome',
  'feather',
  'lucide',
  'anticon',
  'entypo',
  'simplelineicons',
  'octicons',
  'zocial',
  'foundation',
  'evilicons',
  'materialcommunityicons',
];

export function resolveInterStyle(style, hasAncestor = false) {
  if (!style && !hasAncestor) {
    return { fontFamily: 'Inter-Regular', fontWeight: 'normal' };
  }
  if (!style) {
    return style;
  }

  const flat = StyleSheet.flatten(style);
  if (!flat) {
    return hasAncestor ? style : { fontFamily: 'Inter-Regular', fontWeight: 'normal' };
  }

  // Preserve icon fonts completely
  const existingFont = flat.fontFamily;
  if (existingFont) {
    const lowerFont = String(existingFont).toLowerCase();
    for (let i = 0; i < ICON_FONTS.length; i++) {
      if (lowerFont.includes(ICON_FONTS[i])) {
        return style;
      }
    }
  }

  let targetFont = null;
  const rawWeight = flat.fontWeight ? String(flat.fontWeight).toLowerCase() : null;

  if (existingFont) {
    if (
      existingFont.includes('Black') ||
      existingFont.includes('900')
    ) {
      targetFont = 'Inter-Black';
    } else if (
      existingFont.includes('ExtraBold') ||
      existingFont.includes('800')
    ) {
      targetFont = 'Inter-ExtraBold';
    } else if (
      existingFont.includes('SemiBold') ||
      existingFont.includes('600')
    ) {
      targetFont = 'Inter-SemiBold';
    } else if (
      existingFont.includes('Bold') ||
      existingFont.includes('700')
    ) {
      targetFont = 'Inter-Bold';
    } else if (
      existingFont.includes('Medium') ||
      existingFont.includes('500')
    ) {
      targetFont = 'Inter-Medium';
    } else if (
      existingFont.includes('Regular') ||
      existingFont.includes('PlusJakartaSans') ||
      existingFont.includes('Inter')
    ) {
      targetFont = rawWeight && FONT_MAP[rawWeight] ? FONT_MAP[rawWeight] : 'Inter-Regular';
    }
  }

  if (!targetFont) {
    if (rawWeight && FONT_MAP[rawWeight]) {
      targetFont = FONT_MAP[rawWeight];
    } else if (!hasAncestor) {
      targetFont = 'Inter-Regular';
    }
  }

  // If nested and no explicit font or weight was defined, let it inherit from parent
  if (!targetFont) {
    return style;
  }

  const spacingFix = {};
  if (typeof flat.fontSize === 'number' && flat.fontSize > 0) {
    if (typeof flat.lineHeight === 'number' && flat.lineHeight < flat.fontSize * 1.15) {
      spacingFix.lineHeight = Math.ceil(flat.fontSize * 1.25);
    }
    if (flat.letterSpacing === undefined) {
      if (flat.fontSize >= 24) {
        spacingFix.letterSpacing = -0.5;
      } else if (flat.fontSize >= 18) {
        spacingFix.letterSpacing = -0.3;
      } else if (flat.fontSize <= 10.5) {
        spacingFix.letterSpacing = 0.2;
      }
    }
  }

  return [
    style,
    {
      fontFamily: targetFont,
      fontWeight: 'normal',
      ...spacingFix,
    },
  ];
}

const FallbackAncestorContext = React.createContext(false);
const AncestorContext = ReactNative.unstable_TextAncestorContext || FallbackAncestorContext;

let OriginalText = ReactNative.Text;

export const CustomText = React.forwardRef((props, ref) => {
  const hasAncestor = React.useContext(AncestorContext);
  const resolvedStyle = resolveInterStyle(props.style, hasAncestor);
  return <OriginalText {...props} ref={ref} style={resolvedStyle} />;
});

CustomText.displayName = 'Text';

let OriginalTextInput = ReactNative.TextInput;

export const CustomTextInput = React.forwardRef((props, ref) => {
  const resolvedStyle = resolveInterStyle(props.style, false);
  const androidStyle =
    Platform.OS === 'android' && !props.multiline
      ? { textAlignVertical: 'center' }
      : null;

  return (
    <OriginalTextInput
      {...props}
      ref={ref}
      style={[resolvedStyle, androidStyle]}
    />
  );
});

CustomTextInput.displayName = 'TextInput';

try {
  Object.defineProperty(ReactNative, 'Text', {
    get() {
      return CustomText;
    },
    configurable: true,
    enumerable: true,
  });
} catch (_e) {
  ReactNative.Text = CustomText;
}

try {
  Object.defineProperty(ReactNative, 'TextInput', {
    get() {
      return CustomTextInput;
    },
    configurable: true,
    enumerable: true,
  });
} catch (_e) {
  ReactNative.TextInput = CustomTextInput;
}

export default {
  Text: CustomText,
  TextInput: CustomTextInput,
  resolveInterStyle,
};
