import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MsisdnLinkingScreen from '../screens/MsisdnLinkingScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator id="auth" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MsisdnLinking" component={MsisdnLinkingScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
