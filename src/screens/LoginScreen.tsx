import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../theme/tokens';
import { useAuth } from '../services/auth.context';
import { AppButton, AppCard, AppInput } from '../components/Primitives';

const LoginScreen = () => {
  const [msisdn, setMsisdn] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!msisdn || !pin) {
      Alert.alert('Sign in required', 'Enter both MSISDN and PIN to continue.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(msisdn, pin);
    } catch (_error) {
      Alert.alert('Sign in failed', 'Check your credentials and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <View style={styles.brandPill}>
            <Text style={styles.brandPillText}>MTN CVM</Text>
          </View>
          <Text style={Typography.headline}>The Digital Pulse</Text>
          <Text style={[Typography.body, styles.subtitle]}>Premium telecom experiences built for your lifestyle.</Text>
        </View>

        <AppCard style={styles.loginCard} variant="nested">
          <Text style={[Typography.title, { marginBottom: Spacing.lg }]}>Welcome back</Text>

          <View style={styles.inputContainer}>
            <Text style={[Typography.label, styles.inputLabel]}>MSISDN</Text>
            <AppInput
              placeholder="Enter your phone number (+27...)"
              value={msisdn}
              onChangeText={setMsisdn}
              autoCapitalize="none"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[Typography.label, styles.inputLabel]}>Secure PIN</Text>
            <AppInput
              placeholder="Enter your PIN"
              value={pin}
              onChangeText={setPin}
              secureTextEntry
            />
          </View>

          {isLoggingIn ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color={Colors.cta_primary_text} />
            </View>
          ) : (
            <AppButton label="Sign In" onPress={handleLogin} />
          )}

          <View style={styles.footerRow}>
            <Text style={[Typography.body, { color: Colors.on_surface_variant }]}>Need help?</Text>
            <AppButton label="Reset Password" onPress={() => Alert.alert('Support', 'Password reset is available through support channels.')} variant="ghost" />
          </View>
        </AppCard>

        <View style={styles.appFooter}>
          <Text style={[Typography.label, { color: Colors.on_surface_variant }]}>Powered by EngageHub and CVM Intelligence</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  keyboardView: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  brandPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  brandPillText: {
    ...Typography.label,
    color: Colors.on_primary_fixed,
    fontSize: 11,
  },
  subtitle: {
    color: Colors.on_surface_variant,
    maxWidth: '90%',
  },
  loginCard: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  inputLabel: {
    color: Colors.on_surface_variant,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  loadingButton: {
    minHeight: 56,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.cta_primary_bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerRow: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  appFooter: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});

export default LoginScreen;
