import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout } from '../theme/responsive';

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
  const { ss } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);

  const containerClasses =
    variant === 'secondary'
      ? 'bg-cta-secondary-bg border border-cta-secondary-bg'
      : variant === 'ghost'
        ? 'bg-primary/5 border border-primary/10 px-md py-0 shadow-none'
        : 'bg-cta-primary-bg border border-cta-primary-bg';

  const textClasses =
    variant === 'secondary'
      ? 'text-cta-secondary-text'
      : variant === 'ghost'
        ? 'text-on-surface'
        : 'text-cta-primary-text';

  // Compute responsive font size based on variant and device context
  const fontSize = variant === 'ghost' ? ss(14) : ss(15);
  const minHeight = variant === 'ghost' ? layout.buttonHeight - 8 : layout.buttonHeight;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-xl items-center justify-center px-lg shadow-sm ${containerClasses} ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
      style={{ minHeight }}
    >
      <Text
        style={{ fontSize }}
        className={`font-title text-center ${textClasses}`}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const AppCard = ({
  children,
  style,
  className,
  variant = 'default',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
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
      className={`rounded-xl shadow-sm ${bgClass} ${className || ''}`}
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
  const { ss } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);

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
      className={`rounded-md bg-surface-container-high px-md text-on-surface font-body border ${
        focused ? 'border-focus-ghost' : 'border-transparent'
      } ${className || ''}`}
      style={[
        {
          height: layout.inputHeight,
          fontSize: ss(15),
        },
        style,
      ]}
    />
  );
});

