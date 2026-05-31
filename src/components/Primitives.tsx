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
        ? { backgroundColor: 'transparent', color: Colors.on_surface }
        : { backgroundColor: Colors.cta_primary_bg, color: Colors.cta_primary_text };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantStyles.backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        variant === 'ghost' && styles.ghostButton,
      ]}
    >
      <Text style={[Typography.title, { color: variantStyles.color, fontSize: 16 }]}>{label}</Text>
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
    minHeight: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    ...Elevation.ambientSoft,
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Elevation.ambientSoft,
  },
  input: {
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface_container_high,
    paddingHorizontal: Spacing.md,
    color: Colors.on_surface,
    ...Typography.body,
  },
});
