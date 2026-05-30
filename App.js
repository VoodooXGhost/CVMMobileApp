import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';

import { store } from './src/store';
import { AuthProvider, useAuth } from './src/services/auth.context';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/tokens';
import { validateRuntimeConfig } from './src/config/runtime';
import { logger } from './src/services/logger';
import { initHealthMonitoring } from './src/services/health';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();
validateRuntimeConfig();
initHealthMonitoring();

const AppContent = () => {
  const { token, isLoading: isAuthLoading } = useAuth();

  // Defensive, production-grade splash screen lifecycles.
  useEffect(() => {
    const manageSplash = async () => {
      if (!isAuthLoading) {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          logger.warn('Failed to hide splash screen', e);
        }
      }
    };
    manageSplash();
  }, [isAuthLoading]);

  if (isAuthLoading) {
    return null; // Keep splash screen visible ONLY while initial auth is loading
  }

  if (!token) {
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
});
