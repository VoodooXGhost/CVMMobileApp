import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { store } from './src/store';
import { AuthProvider, useAuth } from './src/services/auth.context';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/tokens';
import { validateRuntimeConfig } from './src/config/runtime';
import { logger } from './src/services/logger';
import { initHealthMonitoring } from './src/services/health';
import { I18nProvider } from './src/services/i18n';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();
validateRuntimeConfig();
initHealthMonitoring();

const AppContent = () => {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    WorkSans_700Bold,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Defensive, production-grade splash screen lifecycles.
  useEffect(() => {
    const manageSplash = async () => {
      if (!isAuthLoading && fontsLoaded) {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          logger.warn('Failed to hide splash screen', e);
        }
      }
    };
    manageSplash();
  }, [isAuthLoading, fontsLoaded]);

  if (isAuthLoading || !fontsLoaded) {
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
        <StatusBar style="dark" />
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <I18nProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </I18nProvider>
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
