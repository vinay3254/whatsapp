/**
 * Champagne & Thyme palette, lifted from the Stitch design mockups
 * and the original src/app/index.tsx prototype.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  background: '#fff8f3',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f9f2ed',
  surfaceContainer: '#f3ede8',
  surfaceContainerHigh: '#eee7e2',
  surfaceContainerHighest: '#e8e1dc',
  onSurface: '#1d1b18',
  onSurfaceVariant: '#46483f',
  outline: '#76786e',
  outlineVariant: '#c7c7bc',
  primary: '#3c4429',
  onPrimary: '#ffffff',
  primaryContainer: '#535c3f',
  onPrimaryContainer: '#cad4af',
  secondary: '#8c4b55',
  secondaryContainer: '#fdabb5',
  onSecondaryContainer: '#793c46',
  error: '#ba1a1a',
  champagneSurface: '#FCEBD7',
  peachBubble: '#E5BCA9',
  statusActive: '#535C3F',
  translucentBackground: 'rgba(255, 248, 243, 0.95)',
  translucentOutline: 'rgba(199, 199, 188, 0.2)',
} as const;

export type PaletteColor = keyof typeof Palette;

export const Colors = {
  light: {
    text: Palette.onSurface,
    background: Palette.background,
    backgroundElement: Palette.surfaceContainerLow,
    backgroundSelected: Palette.surfaceContainerHigh,
    textSecondary: Palette.onSurfaceVariant,
  },
  dark: {
    text: Palette.onSurface,
    background: Palette.background,
    backgroundElement: Palette.surfaceContainerLow,
    backgroundSelected: Palette.surfaceContainerHigh,
    textSecondary: Palette.onSurfaceVariant,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
