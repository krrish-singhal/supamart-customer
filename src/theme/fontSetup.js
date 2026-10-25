import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import * as ReactNative from 'react-native';

export const FONT_MAP = {
  '900': 'PlusJakartaSans-ExtraBold',
  black: 'PlusJakartaSans-ExtraBold',
  '800': 'PlusJakartaSans-ExtraBold',
  heavy: 'PlusJakartaSans-ExtraBold',
  extrabold: 'PlusJakartaSans-ExtraBold',
  '700': 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-SemiBold',
  '600': 'PlusJakartaSans-SemiBold',
  semibold: 'PlusJakartaSans-SemiBold',
  '500': 'PlusJakartaSans-SemiBold',
  medium: 'PlusJakartaSans-SemiBold',
  '400': 'PlusJakartaSans-Regular',
  normal: 'PlusJakartaSans-Regular',
  '300': 'PlusJakartaSans-Regular',
  '200': 'PlusJakartaSans-Regular',
  '100': 'PlusJakartaSans-Regular',
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

export function resolveBrandFontStyle(style, hasAncestor = false) {
  if (!style && !hasAncestor) {
    return { fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'normal' };
  }
  if (!style) {
    return style;
  }

  const flat = StyleSheet.flatten(style);
  if (!flat) {
    return hasAncestor ? style : { fontFamily: 'PlusJakartaSans-Regular', fontWeight: 'normal' };
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
      targetFont = 'PlusJakartaSans-ExtraBold';
    } else if (
      existingFont.includes('ExtraBold') ||
      existingFont.includes('800')
    ) {
      targetFont = 'PlusJakartaSans-ExtraBold';
    } else if (
      existingFont.includes('SemiBold') ||
      existingFont.includes('600')
    ) {
      targetFont = 'PlusJakartaSans-SemiBold';
    } else if (
      existingFont.includes('Bold') ||
      existingFont.includes('700')
    ) {
      targetFont = 'PlusJakartaSans-SemiBold';
    } else if (
      existingFont.includes('Medium') ||
      existingFont.includes('500')
    ) {
      targetFont = 'PlusJakartaSans-SemiBold';
    } else if (
      existingFont.includes('Regular') ||
      existingFont.includes('PlusJakartaSans') ||
      existingFont.includes('Inter')
    ) {
      targetFont = rawWeight && FONT_MAP[rawWeight] ? FONT_MAP[rawWeight] : 'PlusJakartaSans-Regular';
    }
  }

  if (!targetFont) {
    if (rawWeight && FONT_MAP[rawWeight]) {
      targetFont = FONT_MAP[rawWeight];
    } else if (!hasAncestor) {
      targetFont = 'PlusJakartaSans-Regular';
    }
  }

  // If nested and no explicit font or weight was defined, let it inherit from parent
  if (!targetFont) {
    return style;
  }

  // Larger emphasised text is a heading; the guide specifies ExtraBold.
  if (flat.fontSize >= 18 && targetFont === 'PlusJakartaSans-SemiBold') {
    targetFont = 'PlusJakartaSans-ExtraBold';
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
  const resolvedStyle = resolveBrandFontStyle(props.style, hasAncestor);
  return <OriginalText {...props} ref={ref} style={resolvedStyle} />;
});

CustomText.displayName = 'Text';

let OriginalTextInput = ReactNative.TextInput;

export const CustomTextInput = React.forwardRef((props, ref) => {
  const resolvedStyle = resolveBrandFontStyle(props.style, false);
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
  // React Native Web exports are read-only. Wrap the forwardRef render instead.
  const renderText = OriginalText.render;
  if (typeof renderText === 'function') {
    OriginalText.render = function BrandedTextRender(props, ref) {
      const hasAncestor = React.useContext(AncestorContext);
      return React.createElement(
        FallbackAncestorContext.Provider,
        { value: true },
        renderText({ ...props, style: resolveBrandFontStyle(props.style, hasAncestor) }, ref),
      );
    };
  }
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
  const renderInput = OriginalTextInput.render;
  if (typeof renderInput === 'function') {
    OriginalTextInput.render = (props, ref) => renderInput(
      { ...props, style: resolveBrandFontStyle(props.style, false) }, ref,
    );
  }
}

export default {
  Text: CustomText,
  TextInput: CustomTextInput,
  resolveBrandFontStyle,
};
