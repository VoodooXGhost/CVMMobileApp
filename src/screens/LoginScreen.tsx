import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../theme/tokens';
import { useAuth } from '../services/auth.context';
import { AppButton, AppCard, AppInput } from '../components/Primitives';
import { platformStorage } from '../services/storage';
import { branding } from '../config/branding';

type LoginMode = 'pin' | 'form';

const PIN_LENGTH = 5;

const LoginScreen = () => {
  const [msisdn, setMsisdn] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [savedIdentity, setSavedIdentity] = React.useState<string>('');
  const [mode, setMode] = React.useState<LoginMode>('pin');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const { signIn } = useAuth();

  React.useEffect(() => {
    const loadLastIdentity = async () => {
      const previous = (await platformStorage.getItemAsync('last_login_identity')) || '';
      if (previous) {
        setSavedIdentity(previous);
        setMsisdn(previous);
        setMode('pin');
      } else {
        setMode('form');
      }
    };
    loadLastIdentity();
  }, []);

  const submit = async (identityValue: string, pinValue: string) => {
    if (!identityValue || !pinValue) {
      Alert.alert('Sign in required', 'Enter both account and PIN to continue.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(identityValue, pinValue);
      await platformStorage.setItemAsync('last_login_identity', identityValue);
      setSavedIdentity(identityValue);
    } catch (_error) {
      Alert.alert('Sign in failed', 'Check your credentials and try again.');
      setPin('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePinPress = (digit: string) => {
    if (pin.length >= PIN_LENGTH || isLoggingIn) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    if (nextPin.length === PIN_LENGTH && msisdn) {
      submit(msisdn, nextPin);
    }
  };

  const handleDeletePin = () => {
    if (isLoggingIn) return;
    setPin((value) => value.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.heroSection}>
          <View style={styles.brandPill}>
            <Text style={styles.brandPillText}>{branding.appTitle}</Text>
          </View>
          <Text style={[Typography.headline, styles.heroTitle]}>{branding.welcomePrefix}</Text>
          <Text style={[Typography.headline, styles.heroTitle]}>{savedIdentity ? savedIdentity.split('@')[0] : 'Customer'}</Text>
          <Text style={[Typography.body, styles.heroSubtitle]}>{mode === 'pin' ? 'Enter your secure PIN.' : 'Sign in with account and PIN.'}</Text>
        </View>

        {mode === 'pin' ? (
          <View style={styles.pinShell}>
            <Pressable onPress={() => setMode('form')}>
              <Text style={styles.switchText}>Not you? Switch account</Text>
            </Pressable>

            <View style={styles.pinDotsRow}>
              {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                <View key={`pin-dot-${index}`} style={[styles.pinDot, index < pin.length && styles.pinDotFilled]} />
              ))}
            </View>

            {isLoggingIn ? (
              <ActivityIndicator color={Colors.on_surface_dark} style={{ marginVertical: Spacing.md }} />
            ) : null}

            <View style={styles.keypad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <Pressable key={`key-${digit}`} style={styles.keypadKey} onPress={() => handlePinPress(String(digit))}>
                  <Text style={styles.keypadKeyText}>{digit}</Text>
                </Pressable>
              ))}
              <View style={styles.keypadSpacer} />
              <Pressable style={styles.keypadKey} onPress={() => handlePinPress('0')}>
                <Text style={styles.keypadKeyText}>0</Text>
              </Pressable>
              <Pressable style={styles.keypadKey} onPress={handleDeletePin}>
                <Text style={styles.keypadKeyText}>⌫</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <AppCard style={styles.loginCard} variant="nested">
            <Text style={[Typography.title, { marginBottom: Spacing.lg }]}>Sign in</Text>

            <View style={styles.inputContainer}>
              <Text style={[Typography.label, styles.inputLabel]}>Account</Text>
              <AppInput
                placeholder="MSISDN or username"
                value={msisdn}
                onChangeText={setMsisdn}
                autoCapitalize="none"
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
              <AppButton label="Sign In" onPress={() => submit(msisdn, pin)} />
            )}

            <AppButton label="Back to PIN" onPress={() => setMode('pin')} variant="ghost" />
          </AppCard>
        )}

        <View style={styles.appFooter}>
          <Text style={[Typography.label, { color: Colors.on_surface_dark_variant }]}>Powered by {branding.appTitle}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface_dark_base,
  },
  keyboardView: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  heroSection: {
    marginTop: Spacing.xl,
    gap: Spacing.xs,
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
  heroTitle: {
    color: Colors.on_surface_dark,
    fontSize: 42,
    lineHeight: 48,
  },
  heroSubtitle: {
    color: Colors.on_surface_dark_variant,
    marginTop: Spacing.sm,
  },
  pinShell: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  switchText: {
    ...Typography.body,
    color: Colors.on_surface_dark,
    textDecorationLine: 'underline',
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  pinDotFilled: {
    backgroundColor: Colors.primary_container,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  keypadKey: {
    width: '31%',
    minHeight: 62,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface_dark_card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadKeyText: {
    ...Typography.title,
    color: Colors.on_surface_dark,
    fontSize: 30,
  },
  keypadSpacer: {
    width: '31%',
  },
  loginCard: {
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
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
  appFooter: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
});

export default LoginScreen;
