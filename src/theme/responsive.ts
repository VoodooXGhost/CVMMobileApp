/**
 * Responsive design token adapters.
 * Adjusts layout metrics dynamically based on the active Window Size Class.
 */

import { SizeClass } from '../hooks/useWindowSizeClass';
import { staticScale } from '../hooks/useResponsiveScale';

export const getResponsiveSpacing = (sizeClass: SizeClass) => {
  const isCompact = sizeClass === 'compact';
  const isMedium = sizeClass === 'medium';

  return {
    xxs: isCompact ? 2 : 4,
    xs: isCompact ? 4 : 8,
    sm: isCompact ? 8 : 12,
    md: isCompact ? 16 : 20,
    lg: isCompact ? 20 : 28, // Scaled down from 24 on compact for tighter viewports
    xl: isCompact ? 24 : 36, // Scaled down from 32 on compact
    xxl: isCompact ? 32 : 48,
    xxxl: isCompact ? 48 : 64,
  };
};

export const getResponsiveTypography = (sizeClass: SizeClass) => {
  const isCompact = sizeClass === 'compact';

  return {
    display: {
      fontSize: isCompact ? 28 : 34,
      lineHeight: isCompact ? 36 : 42,
    },
    headline: {
      fontSize: isCompact ? 22 : 28,
      lineHeight: isCompact ? 30 : 36,
    },
    title: {
      fontSize: isCompact ? 18 : 20,
      lineHeight: isCompact ? 24 : 28,
    },
    body: {
      fontSize: isCompact ? 14 : 16,
      lineHeight: isCompact ? 20 : 24,
    },
    label: {
      fontSize: isCompact ? 12 : 13,
      lineHeight: isCompact ? 16 : 18,
    },
    caption: {
      fontSize: isCompact ? 10 : 11,
      lineHeight: isCompact ? 14 : 16,
    },
  };
};

export const getResponsiveLayout = (sizeClass: SizeClass) => {
  const isCompact = sizeClass === 'compact';

  return {
    buttonHeight: isCompact ? 48 : 60, // 48dp satisfies Android's touch target guidelines (min 48dp)
    inputHeight: isCompact ? 48 : 60,
    headerHeight: isCompact ? 56 : 72,
    tabBarHeight: isCompact ? 64 : 76,
    logoWidth: isCompact ? 120 : 160,
    logoHeight: isCompact ? 54 : 72,
  };
};
