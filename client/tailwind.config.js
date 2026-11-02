/**
 * Design tokens — "Adriatic café": calm, warm neutrals with one deep sea-blue accent.
 * Colors, radii, spacing, shadows and type are *replaced* (not extended), so only these
 * tokens can be used in the UI.
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
      canvas: '#FAF8F5', // app background — warm off-white
      surface: '#FFFFFF', // cards, inputs
      subtle: '#F5F5F4', // stone-100 — hover / muted fills
      line: { DEFAULT: '#E7E5E4', strong: '#D6D3D1' }, // stone-200 / stone-300
      ink: { DEFAULT: '#1C1917', muted: '#78716C', faint: '#A8A29E' }, // stone-900 / 500 / 400
      // The single accent — deep sea blue. White text on it: 9.6:1.
      accent: { DEFAULT: '#0F4C5C', hover: '#0B3B48', soft: '#E8F1F3', line: '#B9D3DA' },
      // Status colors — used only for status.
      success: { DEFAULT: '#15803D', soft: '#F0FDF4', line: '#BBF7D0' },
      warning: { DEFAULT: '#B45309', soft: '#FFFBEB', line: '#FDE68A' },
      danger: { DEFAULT: '#B91C1C', soft: '#FEF2F2', line: '#FECACA' },
    },
    fontFamily: {
      sans: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    // Type scale: 12 / 14 / 16 / 20 / 24 / 32, plus two display sizes for hero numbers only.
    fontSize: {
      xs: [px(12), { lineHeight: px(16) }],
      sm: [px(14), { lineHeight: px(20) }],
      base: [px(16), { lineHeight: px(24) }],
      lg: [px(20), { lineHeight: px(28), letterSpacing: '-0.01em' }],
      xl: [px(24), { lineHeight: px(32), letterSpacing: '-0.015em' }],
      '2xl': [px(32), { lineHeight: px(40), letterSpacing: '-0.02em' }],
      hero: [px(48), { lineHeight: px(52), letterSpacing: '-0.03em' }],
      mega: [px(72), { lineHeight: px(76), letterSpacing: '-0.04em' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    // 4px rhythm
    spacing: {
      0: '0', px: '1px', 0.5: px(2), 1: px(4), 1.5: px(6), 2: px(8), 2.5: px(10), 3: px(12), 3.5: px(14), 4: px(16),
      5: px(20), 6: px(24), 7: px(28), 8: px(32), 9: px(36), 10: px(40), 11: px(44), 12: px(48), 14: px(56),
      16: px(64), 20: px(80), 24: px(96), 28: px(112), 32: px(128), 36: px(144), 40: px(160), 44: px(176), 48: px(192),
      56: px(224), 64: px(256), 72: px(288), 80: px(320), 96: px(384),
    },
    borderRadius: {
      none: '0',
      sm: px(6), // badges, small chips
      md: px(10), // inputs, buttons
      lg: px(12), // cards
      xl: px(16), // modals, loyalty card
      full: '9999px',
    },
    // One level for cards, a stronger one only for floating layers (modals, toasts).
    boxShadow: {
      none: 'none',
      card: '0 1px 2px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.05)',
      modal: '0 24px 48px -12px rgba(28, 25, 23, 0.28), 0 2px 6px rgba(28, 25, 23, 0.06)',
    },
    extend: {
      maxWidth: { content: px(1160) },
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
