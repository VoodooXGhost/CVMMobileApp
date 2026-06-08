import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../theme/tokens';
import { useAuth } from '../services/auth.context';
import { AppButton, AppCard, AppInput } from '../components/Primitives';
import { runtimeConfig } from '../config/runtime';
import { useI18n } from '../services/i18n';
import { resolveLocalizedApiError } from '../services/apiErrors';

const LoginScreen = () => {
  const { t } = useI18n();
  const { signIn, storedMsisdn, clearMsisdn } = useAuth();
  
  const [msisdn, setMsisdn] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sync MSISDN state with stored MSISDN from storage on launch/load
  useEffect(() => {
    if (storedMsisdn) {
      setMsisdn(storedMsisdn);
    } else {
      setMsisdn('');
    }
  }, [storedMsisdn]);

  const handleLogin = async () => {
    const targetMsisdn = storedMsisdn || msisdn;
    if (!targetMsisdn || !pin) {
      Alert.alert(t('login.signInRequired', 'Sign in required'), t('login.enterCredentials', 'Enter both MSISDN and PIN to continue.'));
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(targetMsisdn, pin);
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (!statusCode) {
        const rawMessage =
          typeof error?.message === 'string' && error.message.trim().length > 0
            ? error.message.trim()
            : null;
        Alert.alert(
          t('login.signInFailed', 'Sign in failed'),
          rawMessage
            ? rawMessage
            : `Cannot reach authentication server at ${runtimeConfig.apiUrl}. Verify backend availability and network access.`,
        );
      } else {
        Alert.alert(
          t('login.signInFailed', 'Sign in failed'),
          resolveLocalizedApiError(t, error, t('login.checkCredentials', 'Check your credentials and try again.')),
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSwitchAccount = async () => {
    // Clear stored MSISDN to return to standard two-field login screen
    await clearMsisdn();
    setPin('');
  };

  // Mask MSISDN for display: e.g. 258821234567 -> 258 82***4567
  const maskMsisdn = (num: string) => {
    if (num.length >= 7) {
      return `${num.slice(0, 5)}***${num.slice(num.length - 4)}`;
    }
    return num;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <Image source={require('../../TmcelLogo.png')} style={styles.tmcelLogo} resizeMode="contain" />
          <Text style={styles.titleText}>{t('login.title', 'The Digital Pulse')}</Text>
          <Text style={styles.subtitleText}>{t('login.subtitle', 'Premium telecom experiences built for your lifestyle.')}</Text>
        </View>

        <AppCard style={styles.loginCard} variant="nested">
          <Text style={[Typography.title, styles.welcomeText]}>{t('login.welcomeBack', 'Welcome back')}</Text>

          {storedMsisdn ? (
            // Returning PIN-only User UI
            <View style={styles.returningUserContainer}>
              <View style={styles.msisdnChip}>
                <Text style={[Typography.body, styles.chipText]}>
                  {maskMsisdn(storedMsisdn)}
                </Text>
                <AppButton
                  label={t('login.notYou', 'Not you?')}
                  onPress={handleSwitchAccount}
                  variant="ghost"
                />
              </View>
            </View>
          ) : (
            // First time/logged out flow: Enter MSISDN
            <View style={styles.inputContainer}>
              <Text style={[Typography.label, styles.inputLabel]}>{t('login.msisdn', 'MSISDN')}</Text>
              <AppInput
                placeholder={t('login.phonePlaceholder', 'Enter your phone number')}
                value={msisdn}
                onChangeText={setMsisdn}
                autoCapitalize="none"
                keyboardType="phone-pad"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={[Typography.label, styles.inputLabel]}>{t('login.securePin', 'Secure PIN')}</Text>
            <AppInput
              placeholder={t('login.pinPlaceholder', 'Enter your PIN')}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="default"
            />
          </View>

          {isLoggingIn ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color={Colors.cta_primary_text} size="large" />
            </View>
          ) : (
            <AppButton label={t('login.signIn', 'Sign In')} onPress={handleLogin} />
          )}

          <View style={styles.footerRow}>
            <Text style={[Typography.body, { color: Colors.on_surface_variant }]}>{t('login.needHelp', 'Need help?')}</Text>
            <AppButton
              label={t('login.resetPassword', 'Reset Password')}
              onPress={() =>
                Alert.alert(
                  t('login.support', 'Support'),
                  t('login.supportMessage', 'Password reset is available through support channels.'),
                )
              }
              variant="ghost"
            />
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
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  tmcelLogo: {
    width: '100%',
    height: 140,
    alignSelf: 'center',
  },
  titleText: {
    ...Typography.headline,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitleText: {
    ...Typography.body,
    color: Colors.on_surface_variant,
    textAlign: 'center',
    maxWidth: '90%',
  },
  loginCard: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  welcomeText: {
    marginBottom: Spacing.sm,
  },
  returningUserContainer: {
    marginBottom: Spacing.sm,
  },
  msisdnChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface_container_highest,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minHeight: 52,
  },
  chipText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  inputLabel: {
    color: Colors.on_surface_variant,
    textTransform: 'uppercase',
  },
  loadingButton: {
    minHeight: 60,
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
