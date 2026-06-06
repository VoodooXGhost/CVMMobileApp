import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/tokens';
import { X, Send } from 'lucide-react-native';
import { useP2pTransferMutation } from '../services/apiSlice';
import { track } from '../services/analytics';
import { useI18n } from '../services/i18n';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import { getApiErrorCode, resolveLocalizedApiError } from '../services/apiErrors';

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
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={Typography.headline}>{t('p2p.title', 'Send Money')}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.on_surface} />
            </TouchableOpacity>
          </View>
          
          <Text style={[Typography.body, { marginBottom: Spacing.xl }]}>
            {t('p2p.subtitle', 'Send YelloMola instantly to any Tmcel subscriber.')}
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('p2p.recipientNumber', 'Recipient Number')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0831234567"
              placeholderTextColor={Colors.outline}
              keyboardType="phone-pad"
              value={msisdn}
              onChangeText={setMsisdn}
              editable={!isLoading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('p2p.amountYm', 'Amount (YM)')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.outline}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && { opacity: 0.7 }]} 
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Send size={20} color="#000" />
                <Text style={styles.submitButtonText}>{t('p2p.sendYelloMola', 'SEND YELLOMOLA')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  formGroup: { marginBottom: Spacing.lg },
  label: { ...Typography.label, color: Colors.on_surface_variant, marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surface_container_highest,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 18,
    color: Colors.on_surface,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    gap: 12,
  },
  submitButtonText: { color: '#000', fontWeight: '900', fontSize: 16 },
});

export default P2PTransferModal;
