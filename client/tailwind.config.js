/**
 * Design tokens. Colors, radii, spacing, shadows and type are *replaced* (not extended),
 * so only these tokens can be used in the UI.
 */
const px = (n) => `${n / 16}rem`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',
      canvas: '#F7F5F1', // app background — warm off-white
      surface: '#FFFFFF', // cards
      subtle: '#F1EDE6', // hover / muted fills
      line: { DEFAULT: '#E5DFD5', strong: '#D3CABC' },
      ink: { DEFAULT: '#1C1915', muted: '#5F574D', faint: '#8A8176' },
      // The single accent — espresso / terracotta. White text on it: 6.2:1.
      accent: { DEFAULT: '#9A4A23', hover: '#7F3C1B', soft: '#F6EAE2', ink: '#7A3A1A' },
      success: { DEFAULT: '#2F6B47', soft: '#E6F0E9' },
      warning: { DEFAULT: '#8A5A00', soft: '#FBF1DC' },
      danger: { DEFAULT: '#B42318', soft: '#FBEAE8' },
    },
    fontFamily: {
      sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: [px(12), { lineHeight: px(16) }],
      sm: [px(14), { lineHeight: px(20) }],
      base: [px(16), { lineHeight: px(24) }],
      lg: [px(18), { lineHeight: px(28) }],
      xl: [px(20), { lineHeight: px(28) }],
      '2xl': [px(24), { lineHeight: px(32), letterSpacing: '-0.01em' }],
      '3xl': [px(30), { lineHeight: px(36), letterSpacing: '-0.02em' }],
      '4xl': [px(40), { lineHeight: px(44), letterSpacing: '-0.02em' }],
      '5xl': [px(56), { lineHeight: '1', letterSpacing: '-0.03em' }],
    },
    // 4px rhythm
    spacing: {
      0: '0', px: '1px', 0.5: px(2), 1: px(4), 1.5: px(6), 2: px(8), 2.5: px(10), 3: px(12), 4: px(16),
      5: px(20), 6: px(24), 7: px(28), 8: px(32), 9: px(36), 10: px(40), 11: px(44), 12: px(48), 14: px(56),
      16: px(64), 20: px(80), 24: px(96), 28: px(112), 32: px(128), 40: px(160), 48: px(192), 56: px(224),
      64: px(256), 72: px(288), 80: px(320), 96: px(384),
    },
    borderRadius: {
      none: '0', sm: px(6), DEFAULT: px(8), md: px(10), lg: px(12), xl: px(16), full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: '0 1px 2px rgba(28, 25, 21, 0.06)',
      DEFAULT: '0 1px 3px rgba(28, 25, 21, 0.08), 0 1px 2px rgba(28, 25, 21, 0.04)',
      lg: '0 12px 32px -12px rgba(28, 25, 21, 0.28)',
    },
    extend: {
      maxWidth: { content: px(1120) },
      keyframes: {
        'toast-in': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '0%': { opacity: 1 }, '50%': { opacity: 0.55 }, '100%': { opacity: 1 } },
      },
      animation: {
        'toast-in': 'toast-in 160ms ease-out',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
