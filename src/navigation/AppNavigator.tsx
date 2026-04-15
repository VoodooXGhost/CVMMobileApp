import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Wallet, ShoppingBag, Gift, User } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '../theme/tokens';

import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import ShopScreen from '../screens/ShopScreen';
import RewardsScreen from '../screens/RewardsScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface_container_lowest,
          borderTopWidth: 0,
          elevation: 10,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
          shadowColor: Colors.on_surface,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.on_surface + '66',
        tabBarLabelStyle: {
          ...Typography.label,
          marginTop: 4,
        },
        tabBarIcon: ({ color, size }) => {
          const iconSize = 24;
          if (route.name === 'Home') return <Home size={iconSize} color={color} />;
          if (route.name === 'Wallet') return <Wallet size={iconSize} color={color} />;
          if (route.name === 'Shop') return <ShoppingBag size={iconSize} color={color} />;
          if (route.name === 'Rewards') return <Gift size={iconSize} color={color} />;
          if (route.name === 'My MTN') return <User size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="My MTN" component={AccountScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
