import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts,
  WorkSans_700Bold,
  WorkSans_600SemiBold 
} from '@expo-google-fonts/work-sans';
import { 
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium 
} from '@expo-google-fonts/plus-jakarta-sans';

import { store } from './src/store';
import { AuthProvider, useAuth } from './src/services/auth.context';
import LoginScreen from './src/screens/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/tokens';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const AppContent = () => {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    'WorkSans-Bold': WorkSans_700Bold,
    'WorkSans-SemiBold': WorkSans_600SemiBold,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !isAuthLoading) {
      // This tells the splash screen to hide immediately!
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isAuthLoading]);

  if (!fontsLoaded || isAuthLoading) {
    return null; // Keep splash screen visible
  }

  if (!token) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LoginScreen />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
