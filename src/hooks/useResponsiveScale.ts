/**
 * Responsive Scaling Hooks and Helpers
 *
 * Provides proportional layout scaling and scaled font-sizes that
 * honour the OS user-configured text scaling/accessibility settings.
 */

import { useWindowDimensions, PixelRatio } from 'react-native';

// Base dimensions from the canonical mobile design reference (typically iPhone 13/14 or typical 390dp x 844dp phone screen)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const useResponsiveScale = () => {
  const { width, height } = useWindowDimensions();

  /**
   * Responsive horizontal scaling (dp)
   * Scale proportional to device width.
   */
  const rs = (size: number): number => {
    return (width / BASE_WIDTH) * size;
  };

  /**
   * Responsive vertical scaling (dp)
   * Scale proportional to device height.
   */
  const vs = (size: number): number => {
    return (height / BASE_HEIGHT) * size;
  };

  /**
   * Scaled Size (sp equivalent) for typography
   * Multiplies the proportional scale value by the user's system font scale multiplier.
   *
   * Crucial for accessibility to ensure text scales dynamically when the user selects larger font sizes.
   */
  const ss = (size: number): number => {
    const proportional = rs(size);
    const systemFontScale = PixelRatio.getFontScale();
    return proportional * systemFontScale;
  };

  return {
    rs,
    vs,
    ss,
    width,
    height,
  };
};

/**
 * Static non-hook utilities for style sheets (using screen properties at module import time).
 * Fallback helpers when hook context is not ideal.
 */
import { Dimensions } from 'react-native';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const staticScale = {
  rs: (size: number) => (screenWidth / BASE_WIDTH) * size,
  vs: (size: number) => (screenHeight / BASE_HEIGHT) * size,
  ss: (size: number) => ((screenWidth / BASE_WIDTH) * size) * PixelRatio.getFontScale(),
};
