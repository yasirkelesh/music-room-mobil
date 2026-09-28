// music-room design tokens.
// The interface stays neutral (iOS system greys); colour comes only from album covers.

export const colors = {
  bg: '#F2F2F7', // iOS grouped background
  card: '#FFFFFF',
  label: '#1C1C1E',
  secondary: '#6E6E73',
  tertiary: '#8E8E93',
  disabled: '#AEAEB2',
  separator: 'rgba(60,60,67,0.29)',
  hairline: 'rgba(60,60,67,0.15)',
  fill: 'rgba(118,118,128,0.12)',
  track: 'rgba(60,60,67,0.18)',
  chrome: '#D1D1D6', // silver disc body
  chromeLight: '#E5E5EA',
  graphite: '#3A3A3C',
  black: '#000000',
  white: '#FFFFFF',
  vinyl: '#1A1A19',
  vinylGroove: '#3A3A3C',
  // dark (party) surfaces
  darkBg: '#000000',
  darkSecondary: '#8E8E93',
  darkHairline: 'rgba(255,255,255,0.15)',
} as const;

// Single, optional accent. Graphite by default — the UI reads black & white.
export const accent = {
  light: colors.label,
  dark: colors.white,
} as const;

export const radius = {
  card: 14,
  sheet: 20,
  pill: 999,
  cover: 8,
} as const;

export const space = {
  screen: 20,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
} as const;

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.2 },
  hero: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -0.6 },
  title2: { fontSize: 22, fontWeight: '700' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  callout: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  numeric: { fontVariant: ['tabular-nums' as const] },
};

/** Space the floating mini player + tab bar take at the bottom of each tab screen. */
export const TAB_INSET = 170;
