import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { MotiView } from 'moti';
import { useAuth } from '../services/auth.context';
import { AppButton, AppCard, AppInput } from '../components/Primitives';
import { runtimeConfig } from '../config/runtime';
import { useI18n } from '../services/i18n';
import { resolveLocalizedApiError } from '../services/apiErrors';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useWindowSizeClass } from '../hooks/useWindowSizeClass';
import { getResponsiveLayout } from '../theme/responsive';

const LoginScreen = () => {
  const { t } = useI18n();
  const { signIn, storedMsisdn, clearMsisdn } = useAuth();
  const { ss, rs, height } = useResponsiveScale();
  const { sizeClass } = useWindowSizeClass();
  const layout = getResponsiveLayout(sizeClass);
  
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

  const logoHeight = height * 0.12;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 p-md justify-center gap-md"
      >
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          className="mb-md gap-xs items-center"
        >
          <Image
            source={require('../../TmcelLogo.png')}
            style={{ width: '100%', height: logoHeight }}
            resizeMode="contain"
          />
          <Text
            style={{ fontSize: ss(26) }}
            className="font-headline font-bold text-primary text-center"
          >
            {t('login.title', 'The Digital Pulse')}
          </Text>
          <Text
            style={{ fontSize: ss(14) }}
            className="font-body text-on-surface-variant text-center max-w-[85%]"
          >
            {t('login.subtitle', 'Premium telecom experiences built for your lifestyle.')}
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15, delay: 100 }}
        >
          <AppCard className="p-md gap-sm" variant="nested">
            <Text
              style={{ fontSize: ss(18) }}
              className="font-title text-on-surface font-semibold"
            >
              {t('login.welcomeBack', 'Welcome back')}
            </Text>

            {storedMsisdn ? (
              // Returning PIN-only User UI
              <View className="mb-sm">
                <View
                  style={{ minHeight: rs(50) }}
                  className="flex-row justify-between items-center bg-surface-container-highest px-md py-xs rounded-md"
                >
                  <Text
                    style={{ fontSize: ss(14) }}
                    className="font-body font-semibold text-primary"
                  >
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
              <View className="gap-xs">
                <Text
                  style={{ fontSize: ss(11) }}
                  className="font-label text-on-surface-variant uppercase"
                >
                  {t('login.msisdn', 'MSISDN')}
                </Text>
                <AppInput
                  placeholder={t('login.phonePlaceholder', 'Enter your phone number')}
                  value={msisdn}
                  onChangeText={setMsisdn}
                  autoCapitalize="none"
                  keyboardType="phone-pad"
                />
              </View>
            )}

            <View className="gap-xs">
              <Text
                style={{ fontSize: ss(11) }}
                className="font-label text-on-surface-variant uppercase"
              >
                {t('login.securePin', 'Secure PIN')}
              </Text>
              <AppInput
                placeholder={t('login.pinPlaceholder', 'Enter your PIN')}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                keyboardType="default"
              />
            </View>

            {isLoggingIn ? (
              <View
                style={{ minHeight: layout.buttonHeight }}
                className="rounded-xl bg-cta-primary-bg justify-center items-center shadow-md"
              >
                <ActivityIndicator color="#111316" size="large" />
              </View>
            ) : (
              <AppButton label={t('login.signIn', 'Sign In')} onPress={handleLogin} />
            )}

            <View className="mt-sm items-center gap-xs">
              <Text
                style={{ fontSize: ss(14) }}
                className="font-body text-on-surface-variant"
              >
                {t('login.needHelp', 'Need help?')}
              </Text>
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
        </MotiView>

        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 600, delay: 300 }}
          className="items-center mt-sm"
        >
          <Text
            style={{ fontSize: ss(12) }}
            className="font-label text-on-surface-variant text-center"
          >
            Powered by EngageHub and CVM Intelligence
          </Text>
        </MotiView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
