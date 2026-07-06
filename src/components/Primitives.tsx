import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

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
  const containerClasses =
    variant === 'secondary'
      ? 'bg-cta-secondary-bg border border-cta-secondary-bg'
      : variant === 'ghost'
        ? 'bg-primary/5 border border-primary/10 min-h-[46px] px-md py-0 shadow-none'
        : 'bg-cta-primary-bg border border-cta-primary-bg';

  const textClasses =
    variant === 'secondary'
      ? 'text-cta-secondary-text'
      : variant === 'ghost'
        ? 'text-on-surface text-[15px]'
        : 'text-cta-primary-text';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-[60px] rounded-xl items-center justify-center px-lg shadow-sm ${containerClasses} ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
    >
      <Text className={`font-title text-[16px] text-center ${textClasses}`}>
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
  const bgClass =
    variant === 'hero'
      ? 'bg-primary-container'
      : variant === 'nested'
        ? 'bg-surface-nested-2'
        : 'bg-surface-nested-1';

  return (
    <View
      style={style}
      className={`rounded-xl p-lg shadow-sm ${bgClass}`}
    >
      {children}
    </View>
  );
};

export const AppInput = React.forwardRef<TextInput, TextInputProps>(function AppInput(
  { style, className, ...rest },
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
      placeholderTextColor="rgba(26, 28, 28, 0.4)"
      className={`h-[60px] rounded-md bg-surface-container-high px-md text-on-surface font-body text-[16px] border ${
        focused ? 'border-focus-ghost' : 'border-transparent'
      } ${className || ''}`}
      style={style}
    />
  );
});
