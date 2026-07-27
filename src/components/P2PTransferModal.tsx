import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { X, Send } from 'lucide-react-native';
import { useP2pTransferMutation } from '../services/apiSlice';
import { track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';

interface P2PTransferModalProps {
  visible: boolean;
  onClose: () => void;
}

const P2PTransferModal = ({ visible, onClose }: P2PTransferModalProps) => {
  const { t } = useI18n();
  const [msisdn, setMsisdn] = useState('');
  const [amount, setAmount] = useState('');
  const [transfer, { isLoading }] = useP2pTransferMutation();
  const { authenticate } = useBiometricAuth();
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const handleSend = async () => {
    if (!msisdn || msisdn.length < 10) {
      Alert.alert(t('p2p.invalidInput', 'Invalid Input'), t('p2p.validMsisdn', 'Please enter a valid MSISDN.'));
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('p2p.invalidInput', 'Invalid Input'), t('p2p.validAmount', 'Please enter a valid amount.'));
      return;
    }

    if (useSafePhoneFlow) {
      Alert.alert(
        t('wallet.walletVerificationRequired', 'Wallet verification required'),
        t('wallet.p2pValidationModeBody', 'This device profile does not submit live P2P transfers. Please use a physical device for the production transfer flow.'),
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
      await track(
        'wallet_action_start',
        { action: 'p2p_transfer', receiver_msisdn: msisdn, amount: numAmount },
        { screen: 'wallet', source: 'p2p_modal' },
      );
      await transfer({ receiver_msisdn: msisdn, amount: numAmount }).unwrap();
      await track(
        'wallet_action_success',
        { action: 'p2p_transfer', receiver_msisdn: msisdn, amount: numAmount },
        { screen: 'wallet', source: 'p2p_modal' },
      );
      Alert.alert(t('common.success', 'Success'), t('p2p.transferSuccess', 'Successfully transferred {amount} YM to {msisdn}.').replace('{amount}', String(numAmount)).replace('{msisdn}', String(msisdn)));
      setMsisdn('');
      setAmount('');
      onClose();
    } catch (err: any) {
      const errorCode = getApiErrorCode(err);
      const errorMessage = resolveLocalizedApiError(t, err, t('p2p.transferFailed', 'Transfer failed'));
      await track(
        'wallet_action_fail',
        { action: 'p2p_transfer', receiver_msisdn: msisdn, reason: errorCode || err?.status || 'unknown' },
        { screen: 'wallet', source: 'p2p_modal' },
      );
      if (errorCode === 'wallet_token_expired' || errorCode === 'wallet_step_up_required') {
        Alert.alert(
          t('wallet.walletVerificationRequired', 'Wallet verification required'),
          t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
        );
        return;
      }
      Alert.alert(t('p2p.transferFailed', 'Transfer failed'), errorMessage);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        className="flex-1 bg-black/50 justify-end" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="bg-surface p-xl rounded-t-xl min-h-[400px]">
          <View className="flex-row justify-between items-center mb-md border-b border-outline-variant pb-xs">
            <Text className="font-headline text-[28px] font-bold text-on-surface">{t('p2p.title', 'Send Money')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1a1c1c" />
            </TouchableOpacity>
          </View>
          
          <Text className="font-body text-[16px] text-on-surface-variant mb-xl">
            {t('p2p.subtitle', 'Send YelloMola instantly to any Tmcel subscriber.')}
          </Text>

          <View className="mb-lg">
            <Text className="font-label text-[13px] text-on-surface-variant mb-xs">{t('p2p.recipientNumber', 'Recipient Number')}</Text>
            <TextInput
              className="bg-surface-container-highest rounded-md p-md font-body text-[18px] color-on-surface border border-outline-variant"
              placeholder="e.g. 0831234567"
              placeholderTextColor="rgba(26, 28, 28, 0.4)"
              keyboardType="phone-pad"
              value={msisdn}
              onChangeText={setMsisdn}
              editable={!isLoading}
            />
          </View>

          <View className="mb-lg">
            <Text className="font-label text-[13px] text-on-surface-variant mb-xs">{t('p2p.amountYm', 'Amount (YM)')}</Text>
            <TextInput
              className="bg-surface-container-highest rounded-md p-md font-body text-[18px] color-on-surface border border-outline-variant"
              placeholder="0.00"
              placeholderTextColor="rgba(26, 28, 28, 0.4)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            className={`bg-[#ffcc00] flex-row justify-center items-center p-md rounded-full mt-xl gap-3 min-h-[60px] shadow-sm active:opacity-90 ${isLoading ? 'opacity-70' : ''}`}
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Send size={20} color="#000" />
                <Text className="color-[#000] font-black text-[16px]">{t('p2p.sendYelloMola', 'SEND YELLOMOLA')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default P2PTransferModal;
