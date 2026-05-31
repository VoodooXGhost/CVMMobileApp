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
import { useI18n } from '../services/i18n';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      id="main"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home', 'Home') }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: t('nav.wallet', 'Wallet') }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: t('nav.marketplace', 'Marketplace') }} />
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ title: t('nav.rewards', 'Rewards') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('nav.myAccount', 'My Account') }} />
    </Tab.Navigator>
  );
};

export default AppNavigator;
