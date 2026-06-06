/**
 * The Digital Pulse Design Tokens
 *
 * Stitch-first premium baseline with yellow-led CTAs and no muddy primary tones.
 */
export const Colors = {
  // Base surfaces
  surface: '#ffffff',
  surface_container_lowest: '#ffffff',
  surface_container_low: '#fafafa',
  surface_container_high: '#f3f3f3',
  surface_container_highest: '#ebebeb',

  // Brand + contrast
  primary: '#111316',
  primary_container: '#ffcc00',
  on_primary_fixed: '#1c1600',
  on_surface: '#1a1c1c',
  on_surface_variant: '#5c5f5f',

  // Accent + status
  secondary: '#2260a2',
  tertiary_container: '#00e7fe',
  success: '#1b8354',
  warning: '#c56d00',
  error: '#ba1a1a',

  // Border / focus
  outline: 'rgba(26, 28, 28, 0.35)',
  outline_variant: 'rgba(26, 28, 28, 0.2)',

  // Semantic interaction tokens
  cta_primary_bg: '#ffcc00',
  cta_primary_text: '#111316',
  cta_secondary_bg: '#111316',
  cta_secondary_text: '#ffffff',
  focus_ghost: 'rgba(26, 28, 28, 0.2)',
  glass_surface: 'rgba(255,255,255,0.78)',

  // Nested section helpers
  surface_nested_1: '#f3f3f3',
  surface_nested_2: '#ffffff',

  // Status tints
  status_success_bg: '#e8f8f0',
  status_warning_bg: '#fff4e5',
  status_error_bg: '#fdeeee',
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  display: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  headline: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  title: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
};

export const Elevation = {
  ambientSoft: {
    elevation: 4,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  ambientLift: {
    elevation: 8,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },
};
