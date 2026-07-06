/**
 * useWindowSizeClass — Jetpack Compose WindowSizeClass equivalent for React Native.
 *
 * Classifies the current screen width into one of three size classes:
 *   - compact  : width < 600dp  → Standard Android phones
 *   - medium   : 600–839dp      → Large phones, foldables (half-open), small tablets
 *   - expanded : ≥ 840dp        → Tablets, foldables (fully open), landscape large phones
 *
 * These breakpoints mirror Google's Material3 / Adaptive UI guidance exactly.
 *
 * Usage:
 *   const { sizeClass, isCompact, width, height } = useWindowSizeClass();
 */

import { useWindowDimensions } from 'react-native';

export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface WindowSizeClass {
  /** The resolved size class based on current window width */
  sizeClass: SizeClass;
  /** True when the device is a compact phone (width < 600dp) */
  isCompact: boolean;
  /** True when the device is a medium-width screen (600–839dp) */
  isMedium: boolean;
  /** True when the device is a large/expanded screen (≥ 840dp) */
  isExpanded: boolean;
  /** Current window width in dp */
  width: number;
  /** Current window height in dp */
  height: number;
}

/**
 * Classifies the given width (dp) into a WindowSizeClass.
 * Exported for use in non-hook contexts (e.g. StyleSheet factories).
 */
export function resolveSizeClass(widthDp: number): SizeClass {
  if (widthDp < 600) return 'compact';
  if (widthDp < 840) return 'medium';
  return 'expanded';
}

/**
 * Hook that returns the current Window Size Class and dimension values.
 * Automatically re-runs when the user rotates the device or folds/unfolds.
 */
export function useWindowSizeClass(): WindowSizeClass {
  const { width, height } = useWindowDimensions();
  const sizeClass = resolveSizeClass(width);

  return {
    sizeClass,
    isCompact: sizeClass === 'compact',
    isMedium: sizeClass === 'medium',
    isExpanded: sizeClass === 'expanded',
    width,
    height,
  };
}
