/**
 * SupaMart Design System - Typography Tokens
 * Powered by Inter (loaded with true weight-specific font files)
 *
 * NOTE FOR REACT NATIVE / ANDROID:
 * Always keep `fontWeight: 'normal'` when using weight-specific font families
 * like `Inter-Bold` or `Inter-ExtraBold`. Setting `fontWeight: 'bold'` or `'700'`
 * alongside `Inter-Bold` causes Android's Typeface manager to fail and fall back to Roboto!
 */

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
};

export const typography = {
  // Screen Titles & Large Headings
  h1: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: '#0f172a',
  },
  h2: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: '#0f172a',
  },
  h3: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: '#0f172a',
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: '#0f172a',
  },
  subSectionTitle: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: '#0f172a',
  },

  // Product & Card Typography
  productTitle: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 14,
    lineHeight: 18,
    color: '#0f172a',
  },
  productUnit: {
    fontFamily: fonts.regular,
    fontWeight: 'normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#64748b',
  },
  productPrice: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 20,
    color: '#0f172a',
  },
  productMrp: {
    fontFamily: fonts.regular,
    fontWeight: 'normal',
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  productNote: {
    fontFamily: fonts.regular,
    fontWeight: 'normal',
    fontSize: 11.5,
    lineHeight: 15,
    color: '#64748b',
  },

  // Category & Store Labels
  storeLabel: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 13.5,
    lineHeight: 18,
    color: '#0f172a',
  },
  categoryGridLabel: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#0f172a',
    textAlign: 'center',
  },
  sidebarActive: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 11,
    lineHeight: 15,
    color: '#0f172a',
  },
  sidebarInactive: {
    fontFamily: fonts.medium,
    fontWeight: 'normal',
    fontSize: 11,
    lineHeight: 15,
    color: '#64748b',
  },

  // Pills, Badges & Overlines
  badge: {
    fontFamily: fonts.extraBold,
    fontWeight: 'normal',
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  etaPill: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 9.5,
    color: '#065f46',
  },
  featurePill: {
    fontFamily: fonts.semiBold,
    fontWeight: 'normal',
    fontSize: 11.5,
    color: '#334155',
  },

  // Buttons & CTAs
  button: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 15,
    textAlign: 'center',
  },
  buttonSmall: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 13,
    textAlign: 'center',
  },
  link: {
    fontFamily: fonts.bold,
    fontWeight: 'normal',
    fontSize: 13,
    color: '#047857',
  },

  // Body & Descriptions
  body: {
    fontFamily: fonts.regular,
    fontWeight: 'normal',
    fontSize: 13.5,
    lineHeight: 21,
    color: '#475569',
  },
  caption: {
    fontFamily: fonts.regular,
    fontWeight: 'normal',
    fontSize: 12,
    lineHeight: 16,
    color: '#64748b',
  },
};

export default typography;
