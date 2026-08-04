import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { Home, Smartphone, Store, User } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useI18n } from '../services/i18n';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout } from '../theme/responsive';

const TabItem = ({
  isFocused,
  renderIcon,
  label,
  onPress,
}: {
  isFocused: boolean;
  renderIcon: (color: string) => React.ReactNode;
  label: string;
  onPress: () => void;
}) => {
  const scale = useSharedValue(isFocused ? 1.08 : 1.0);
  const { rs, ss } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const isCompact = sizeClass === 'compact';

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.08 : 1.0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const btnSize = isCompact ? 36 : 44;
  const fontSize = isCompact ? 9 : 11;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center justify-center flex-1 min-w-[48px]"
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          animatedStyle,
          { width: btnSize, height: btnSize }
        ]}
        className={`rounded-full items-center justify-center ${
          isFocused ? 'bg-cta-primary-bg shadow-sm' : 'bg-transparent'
        }`}
      >
        {renderIcon(isFocused ? '#1c1600' : 'rgba(26, 28, 28, 0.6)')}
      </Animated.View>
      <Text
        style={{ fontSize, marginTop: 2 }}
        className={`font-label uppercase ${
          isFocused ? 'text-on-surface font-semibold' : 'text-on-surface-variant'
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const GlassTabBar = ({ state, descriptors, navigation }: any) => {
  const { t } = useI18n();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);

  const containerWidth = sizeClass === 'compact' ? '94%' : '88%';
  const bottomDistance = sizeClass === 'compact' ? 12 : 20;

  return (
    <View
      style={{ bottom: bottomDistance }}
      className="absolute left-0 right-0 items-center justify-center bg-transparent"
    >
      <View
        style={[
          Platform.OS === 'web'
            ? { boxShadow: '0px 12px 24px rgba(26, 28, 28, 0.08)' }
            : undefined,
          { width: containerWidth, height: layout.tabBarHeight }
        ]}
        className="flex-row bg-glass-surface rounded-full px-sm items-center justify-around shadow-lg"
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const renderIcon = (color: string) => {
            const isCompact = sizeClass === 'compact';
            const iconSize = isCompact ? 18 : 22;
            if (route.name === 'Home') return <Home size={iconSize} color={color} />;
            if (route.name === 'Wallet') return <Smartphone size={iconSize} color={color} />;
            if (route.name === 'Marketplace') return <Store size={iconSize} color={color} />;
            if (route.name === 'Account') return <User size={iconSize} color={color} />;
            return null;
          };

          const label =
            route.name === 'Account'
              ? t('nav.account', 'Account')
              : route.name === 'Marketplace'
                ? t('nav.store', 'Store')
                : options.title || route.name;

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              renderIcon={renderIcon}
              label={label}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

export default GlassTabBar;
