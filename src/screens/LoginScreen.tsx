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
  const [msisdn, setMsisdn] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!msisdn || !pin) {
      Alert.alert(t('login.signInRequired', 'Sign in required'), t('login.enterCredentials', 'Enter both MSISDN and PIN to continue.'));
      return;
    }

    setIsLoggingIn(true);
    try {
      await signIn(msisdn, pin);
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <Image source={require('../../TmcelLogo.png')} style={styles.tmcelLogo} resizeMode="contain" />
          <Text style={Typography.headline}>{t('login.title', 'The Digital Pulse')}</Text>
          <Text style={[Typography.body, styles.subtitle]}>{t('login.subtitle', 'Premium telecom experiences built for your lifestyle.')}</Text>
        </View>

        <AppCard style={styles.loginCard} variant="nested">
          <Text style={[Typography.title, { marginBottom: Spacing.lg }]}>{t('login.welcomeBack', 'Welcome back')}</Text>

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

          <View style={styles.inputContainer}>
            <Text style={[Typography.label, styles.inputLabel]}>{t('login.securePin', 'Secure PIN')}</Text>
            <AppInput
              placeholder={t('login.pinPlaceholder', 'Enter your PIN')}
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
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tmcelLogo: {
    width: 120,
    height: 42,
    alignSelf: 'flex-start',
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
