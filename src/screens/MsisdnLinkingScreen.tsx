import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { AppButton, AppInput } from '../components/Primitives';
import { useAuth } from '../services/auth.context';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useI18n } from '../services/i18n';

// Assuming this type will be in the navigation params, but we can type it locally
type RootStackParamList = {
  MsisdnLinking: {
    googleSub: string;
    googleEmail: string;
    googleName: string;
  };
  HomeTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'MsisdnLinking'>;

const MsisdnLinkingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { googleSub, googleEmail, googleName } = route.params;
  const { t } = useI18n();
  const { ss } = useResponsiveScale();
  const { linkGoogleAccount } = useAuth();

  const [msisdn, setMsisdn] = useState('');
  const [birthday, setBirthday] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = () => {
    if (!msisdn || msisdn.length < 8) {
      Alert.alert(t('common.error'), t('login.enterValidMsisdn', 'Please enter a valid Tmcel number.'));
      return;
    }
    // Mock OTP sending
    setIsOtpSent(true);
    Alert.alert(t('common.success'), t('login.otpSent', 'OTP sent to your number. (Mock: any 4 digits)'));
  };

  const handleLinkAccount = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert(t('common.error'), t('login.enterValidOtp', 'Please enter a valid OTP.'));
      return;
    }
    
    setIsLoading(true);
    try {
      await linkGoogleAccount(googleSub, msisdn, otp, googleEmail, birthday);
      // Navigation will be handled automatically by the auth context state change
      // because token will be set, but just in case:
      // navigation.replace('HomeTabs');
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error?.message || t('login.linkFailed', 'Failed to link account. Please check your OTP and try again.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: ss(24), flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ marginBottom: ss(32) }}>
            <Text style={{ fontSize: ss(28), fontWeight: '700', color: '#111827', marginBottom: ss(8) }}>
              Almost there, {googleName}!
            </Text>
            <Text style={{ fontSize: ss(16), color: '#4B5563', lineHeight: ss(24) }}>
              To secure your account and show your balances, we need to link your Google account to your Tmcel number.
            </Text>
          </View>

          <View>
            <Text style={{ marginBottom: ss(4), color: '#374151', fontSize: ss(14), fontWeight: '600' }}>
              Tmcel Number (MSISDN)
            </Text>
            <AppInput
              placeholder="e.g. 821234567"
              value={msisdn}
              onChangeText={setMsisdn}
              keyboardType="phone-pad"
              editable={!isOtpSent}
            />
          </View>

          {!isOtpSent ? (
            <View style={{ marginTop: ss(16) }}>
              <AppButton
                label="Send Verification Code"
                onPress={handleSendOtp}
              />
            </View>
          ) : (
            <>
              <View style={{ marginTop: ss(16) }}>
                <Text style={{ marginBottom: ss(4), color: '#374151', fontSize: ss(14), fontWeight: '600' }}>
                  Date of Birth (Optional)
                </Text>
                <AppInput
                  placeholder="YYYY-MM-DD"
                  value={birthday}
                  onChangeText={setBirthday}
                />
              </View>
              <View style={{ marginTop: ss(16) }}>
                <Text style={{ marginBottom: ss(4), color: '#374151', fontSize: ss(14), fontWeight: '600' }}>
                  Verification Code (OTP)
                </Text>
                <AppInput
                  placeholder="Enter 4-digit code"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <View style={{ marginTop: ss(24) }}>
                <AppButton
                  label={isLoading ? 'Linking Account...' : 'Verify & Link'}
                  onPress={handleLinkAccount}
                  disabled={isLoading}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MsisdnLinkingScreen;
