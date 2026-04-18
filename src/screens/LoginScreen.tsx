import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme/tokens';
import { useAuth } from '../services/auth.context';

const LoginScreen = () => {
  // MSISDN + PIN state: matches Option A mobile-first auth flow
  const [msisdn, setMsisdn] = useState('+27821234567');
  const [pin, setPin] = useState('@dmin!10');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn } = useAuth();

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!msisdn || !pin) {
      Alert.alert('Error', 'Please enter both MSISDN and PIN.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(msisdn, pin);
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* Logo placeholder - in production would be the MTN logo */}
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>MTN</Text>
            </View>
          </View>
          <Text style={Typography.headline}>The Digital Pulse</Text>
          <Text style={[Typography.body, styles.subtitle]}>
            Elevating your connectivity experience.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Glassmorphism Effect Card */}
          <View style={styles.card}>
            <Text style={[Typography.title, styles.label]}>Sign In</Text>
            
            <View style={styles.inputContainer}>
              <Text style={Typography.label}>MSISDN</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'msisdn' && styles.inputFocused
                ]}
                placeholder="Enter your phone number (+27...)"
                placeholderTextColor={Colors.on_surface + '66'}
                value={msisdn}
                onChangeText={setMsisdn}
                onFocus={() => setFocusedInput('msisdn')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="none"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={Typography.label}>Secure PIN</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'pin' && styles.inputFocused
                ]}
                placeholder="Enter your PIN"
                placeholderTextColor={Colors.on_surface + '66'}
                value={pin}
                onChangeText={setPin}
                onFocus={() => setFocusedInput('pin')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color={Colors.on_primary_fixed} />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={[Typography.label, { color: Colors.secondary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.asymmetricDecoration} />
        </View>

        <View style={styles.footer}>
          <Text style={Typography.label}>Powered by EngageHub & Virtual Card Engine</Text>
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
  },
  header: {
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    // Soft shadow instead of border: using elevation for native and boxShadow for web
    elevation: 2,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    ...(Platform.OS === 'web' && { boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }),
  },
  logoText: {
    fontFamily: 'WorkSans-Bold',
    fontSize: 24,
    color: Colors.on_primary_fixed,
  },
  subtitle: {
    color: Colors.on_surface + '99',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  formContainer: {
    position: 'relative',
  },
  card: {
    backgroundColor: Colors.surface_container_lowest,
    borderRadius: BorderRadius.xl, // 1.5rem
    padding: Spacing.xl,
    zIndex: 2,
    zIndex: 2,
    // Soft glow ambient shadow: Diffused for editorial feel
    elevation: 5,
    shadowColor: Colors.on_surface,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    ...(Platform.OS === 'web' && { boxShadow: '0px 12px 24px rgba(26, 28, 28, 0.06)' }),
  },
  asymmetricDecoration: {
    position: 'absolute',
    top: -Spacing.md,
    right: -Spacing.sm,
    width: '60%',
    height: '100%',
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.xl,
    zIndex: 1,
    opacity: 0.3,
    transform: [{ rotate: '2deg' }],
  },
  label: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  input: {
    height: 56,
    backgroundColor: Colors.surface_container_high,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    fontSize: 16,
    color: Colors.on_surface,
  },
  inputFocused: {
    // Ghost border on focus: outline_variant at 20% opacity
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  loginButton: {
    height: 56,
    backgroundColor: Colors.primary_container,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginTop: Spacing.lg,
    // Soft signature texture would be a gradient, here we use elevation
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    ...(Platform.OS === 'web' && { boxShadow: '0px 4px 8px rgba(116, 91, 0, 0.2)' }),
  },
  loginButtonText: {
    color: Colors.on_primary_fixed,
    fontSize: 18,
    fontFamily: 'WorkSans-SemiBold',
  },
  forgotPassword: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  footer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    opacity: 0.5,
  },
});

export default LoginScreen;
