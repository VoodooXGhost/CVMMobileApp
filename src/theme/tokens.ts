/**
 * The Digital Pulse Design Tokens
 * 
 * Based on DESIGN.md
 */

export const Colors = {
  // Base Layer
  surface: '#f9f9f9',
  on_surface: '#1a1c1c',

  // Primary Containers
  primary: '#745b00',
  primary_container: '#ffcc00',
  on_primary_fixed: '#241a00',

  // Tonal Layering
  surface_container_lowest: '#ffffff', // High lift
  surface_container_low: '#f3f3f3',    // Base section
  surface_container_high: '#e8e8e8',   // Inputs
  surface_container_highest: '#e0e0e0', // High contrast

  // Accents
  secondary: '#2260a2',    // Progress track
  tertiary_container: '#00e7fe', // High-energy badges

  // Border Fallbacks (20% opacity as per DESIGN.md)
  outline_variant: 'rgba(26, 28, 28, 0.2)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 12, // 0.75rem
  lg: 16, 
  xl: 24, // 1.5rem for buttons
  full: 9999,
};

export const Typography = {
  // Headlines (Work Sans)
  display: {
    fontSize: 56, // 3.5rem
    fontFamily: 'WorkSans-Bold',
    lineHeight: 64,
  },
  headline: {
    fontSize: 28, // 1.75rem
    fontFamily: 'WorkSans-SemiBold',
    lineHeight: 36,
  },
  // Body (Plus Jakarta Sans)
  title: {
    fontSize: 18, // 1.125rem
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 24,
  },
  body: {
    fontSize: 14, // 0.875rem
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 16,
  },
};
