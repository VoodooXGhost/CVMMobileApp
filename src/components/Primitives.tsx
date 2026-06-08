import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Elevation, Spacing, Typography } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export const AppButton = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}) => {
  const variantStyles =
    variant === 'secondary'
      ? { backgroundColor: Colors.cta_secondary_bg, color: Colors.cta_secondary_text }
      : variant === 'ghost'
        ? {
            backgroundColor: 'rgba(17, 19, 22, 0.04)',
            color: Colors.on_surface,
            borderColor: 'rgba(17, 19, 22, 0.08)',
          }
        : { backgroundColor: Colors.cta_primary_bg, color: Colors.cta_primary_text };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.ghostButton,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text
        style={[
          Typography.title,
          {
            color: variantStyles.color,
            fontSize: variant === 'ghost' ? 15 : 16,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const AppCard = ({
  children,
  style,
  variant = 'default',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero' | 'nested';
}) => {
  const backgroundColor =
    variant === 'hero'
      ? Colors.primary_container
      : variant === 'nested'
        ? Colors.surface_nested_2
        : Colors.surface_nested_1;

  return <View style={[styles.card, { backgroundColor }, style]}>{children}</View>;
};

export const AppInput = React.forwardRef<TextInput, TextInputProps>(function AppInput(
  { style, ...rest },
  ref,
) {
  const [focused, setFocused] = React.useState(false);
  return (
    <TextInput
      ref={ref}
      {...rest}
      onFocus={(event) => {
        setFocused(true);
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        rest.onBlur?.(event);
      }}
      placeholderTextColor={`${Colors.on_surface}66`}
      style={[
        styles.input,
        focused && { borderColor: Colors.focus_ghost, borderWidth: 1 },
        style as any,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  button: {
    // Increased minHeight to 60px for a more touch-friendly, premium feel matching enterprise standards
    minHeight: 60,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    ...Elevation.ambientSoft,
  },
  ghostButton: {
    minHeight: 46,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    overflow: 'hidden',
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Elevation.ambientSoft,
  },
  input: {
    // Increased height to 60px to match buttons and improve spacing/readability
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface_container_high,
    paddingHorizontal: Spacing.md,
    color: Colors.on_surface,
    ...Typography.body,
  },
});
