import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/tokens';
import { Home, Wallet, ShoppingBag, Gift, User } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
            if (route.name === 'Shop') return <ShoppingBag size={iconSize} color={color} />;
            if (route.name === 'Rewards') return <Gift size={iconSize} color={color} />;
            if (route.name === 'My MTN') return <User size={iconSize} color={color} />;
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
                <Text style={[Typography.label, { color: Colors.on_surface, marginTop: 4, fontSize: 10 }]}>
                  {route.name === 'My MTN' ? 'Account' : route.name}
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
    width: width * 0.9,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent for glass effect
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
    // Ambient light shadow
    elevation: 8,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    ...(Platform.OS === 'web' && { boxShadow: '0px 12px 24px rgba(26, 28, 28, 0.08)' }),
    // Backdrop blur would be applied here in a real environment
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
    backgroundColor: Colors.primary_container,
  },
});

export default GlassTabBar;
