import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Wallet, ShoppingBag, Gift, User } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '../theme/tokens';

import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import RewardsScreen from '../screens/RewardsScreen';
import AccountScreen from '../screens/AccountScreen';

import GlassTabBar from '../components/GlassTabBar';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  return (
    <Tab.Navigator
      id="main"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="My MTN" component={AccountScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
