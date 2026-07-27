import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { AppInput, AppButton } from './Primitives';
import { useInitiateTransferMutation } from '../services/apiSlice';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { resolveLocalizedApiError } from '../services/apiErrors';
import { ensureWalletAccess } from '../services/walletAccess';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';

interface SendMoneyModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SendMoneyModal({ visible, onClose }: SendMoneyModalProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [initiateTransfer, { isLoading }] = useInitiateTransferMutation();

  const { authenticate } = useBiometricAuth();
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const handleSend = async () => {
    const numAmount = parseFloat(amount);
    if (!recipient.trim()) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterRecipient', 'Please enter a valid recipient phone number.'));
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterAmount', 'Please enter a valid transfer amount.'));
      return;
    }

    if (useSafePhoneFlow) {
      Alert.alert(
        t('common.unavailable', 'Unavailable'),
        t(
          'wallet.transferValidationModeBody',
          'This device profile does not submit live transfers. Please use a physical device for the production transfer flow.',
        ),
      );
      return;
    }

    try {
      const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
      if (!accepted) {
        Alert.alert(
          t('wallet.walletVerificationRequired', 'Wallet verification required'),
          t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
        );
        return;
      }
      await ensureWalletAccess();
      const response = await initiateTransfer({
        recipient_msisdn: recipient.trim(),
        amount: numAmount,
      }).unwrap();

      Alert.alert(
        t('common.success', 'Success'),
        t('wallet.transferSuccess', 'Successfully sent MZN {amount} to {recipient}')
          .replace('{amount}', String(numAmount))
          .replace('{recipient}', recipient),
        [{ text: 'OK', onPress: () => {
          setRecipient('');
          setAmount('');
          onClose();
        }}]
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Error'),
        resolveLocalizedApiError(
          t,
          error,
          t('wallet.transferFailed', 'Transfer failed. Please try again.'),
        )
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(24) }}>
            <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary }}>
              {t('wallet.sendMoney', 'Send Money (eMola)')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: ss(16), marginBottom: ss(24) }}>
            <View>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.recipientNumber', 'Recipient Phone Number')}
              </Text>
              <AppInput
                placeholder="e.g. 821234567"
                keyboardType="phone-pad"
                value={recipient}
                onChangeText={setRecipient}
              />
            </View>

            <View>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.amountMzn', 'Amount (MZN)')}
              </Text>
              <AppInput
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <AppButton
            label={isLoading ? 'Sending...' : t('wallet.confirmSend', 'Send Now')}
            onPress={handleSend}
            disabled={isLoading}
          />
        </View>
      </View>
    </Modal>
  );
}
