import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography, Elevation } from '../theme/tokens';
import { Home, Wallet, Store, Gift, User } from 'lucide-react-native';

// GlassTabBar: Custom floating pill-shaped tab bar with icon highlighting.
// useWindowDimensions hook (not Dimensions.get) is used here intentionally:
// module-level Dimensions calls fail in Release APK builds before the JS bridge is ready.
const GlassTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabBarPill}>
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
            if (route.name === 'Home') return <Home size={iconSize} color={color} />;
            if (route.name === 'Wallet') return <Wallet size={iconSize} color={color} />;
            if (route.name === 'Marketplace') return <Store size={iconSize} color={color} />;
            if (route.name === 'Rewards') return <Gift size={iconSize} color={color} />;
            if (route.name === 'Account') return <User size={iconSize} color={color} />;
            return null;
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={[
                  styles.iconContainer,
                  isFocused && styles.activeIconContainer
              ]}>
                {renderIcon(isFocused ? Colors.on_primary_fixed : Colors.on_surface + '99')}
              </View>
              {isFocused && (
                <Text style={[Typography.label, { color: Colors.on_surface, marginTop: 4, fontSize: 10, textTransform: 'uppercase' }]}>
                  {route.name === 'Marketplace' ? 'Store' : route.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabBarPill: {
    flexDirection: 'row',
    width: '92%',
    height: 68,
    backgroundColor: Colors.glass_surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Elevation.ambientLift,
    ...(Platform.OS === 'web' && { boxShadow: '0px 12px 24px rgba(26, 28, 28, 0.08)' }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },
  activeIconContainer: {
    backgroundColor: Colors.cta_primary_bg,
  },
});

export default GlassTabBar;
