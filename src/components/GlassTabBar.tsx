import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { Home, Wallet, Store, Gift, User } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useI18n } from '../services/i18n';

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
  const scale = useSharedValue(isFocused ? 1.12 : 1.0);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.12 : 1.0, {
      damping: 15,
      stiffness: 150,
    });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      className="items-center justify-center flex-1 min-w-[56px]"
      activeOpacity={0.8}
    >
      <Animated.View
        style={animatedStyle}
        className={`w-11 h-11 rounded-full items-center justify-center ${
          isFocused ? 'bg-cta-primary-bg shadow-md' : 'bg-transparent'
        }`}
      >
        {renderIcon(isFocused ? '#1c1600' : 'rgba(26, 28, 28, 0.6)')}
      </Animated.View>
      <Text
        className={`font-label text-[10px] uppercase mt-1 ${
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
  return (
    <View className="absolute bottom-xl left-0 right-0 items-center justify-center bg-transparent">
      <View
        className="flex-row w-[92%] h-[68px] bg-glass-surface rounded-full px-sm items-center justify-around shadow-lg"
        style={
          Platform.OS === 'web'
            ? { boxShadow: '0px 12px 24px rgba(26, 28, 28, 0.08)' }
            : undefined
        }
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
            const iconSize = 22;
            if (index === 0) return <Home size={iconSize} color={color} />;
            if (index === 1) return <Wallet size={iconSize} color={color} />;
            if (index === 2) return <Store size={iconSize} color={color} />;
            if (index === 3) return <Gift size={iconSize} color={color} />;
            if (index === 4) return <User size={iconSize} color={color} />;
            return null;
          };

          const label =
            index === 4
              ? t('nav.account', 'Account')
              : index === 2
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
