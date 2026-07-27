import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { AppInput, AppButton } from './Primitives';
import { useBuyAirtimeMutation } from '../services/apiSlice';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import PaymentProviderSelector from './PaymentProviderSelector';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { runtimeConfig } from '../config/runtime';
import { ensureWalletAccess } from '../services/walletAccess';
import { isMissingMobileMoneyContract, openTmcelMenu } from '../services/telephonyFallback';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';

interface BuyAirtimeModalProps {
  visible: boolean;
  onClose: () => void;
  eMolaBalance?: number;
}

export default function BuyAirtimeModal({ visible, onClose, eMolaBalance }: BuyAirtimeModalProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();
  const [recipientOption, setRecipientOption] = useState<'self' | 'other'>('self');
  const [recipientMsisdn, setRecipientMsisdn] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'emola' | 'mkesh' | 'millennium_izi'>('emola');
  const [buyAirtime, { isLoading }] = useBuyAirtimeMutation();

  const presets = [20, 50, 100, 200, 500];

  const handlePresetSelect = (value: number) => {
    setSelectedPreset(value);
    setAmount(String(value));
  };

  const handleAmountChange = (text: string) => {
    setSelectedPreset(null);
    setAmount(text);
  };

  const { authenticate } = useBiometricAuth();
  // Only block virtual devices. Real phones in validation builds should still
  // exercise the live airtime path so UAT can validate true end-to-end flows.
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const handlePurchase = async () => {
    const numAmount = parseFloat(amount);
    if (recipientOption === 'other' && !recipientMsisdn.trim()) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterRecipient', 'Please enter a valid recipient phone number.'));
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterAmount', 'Please enter a valid amount.'));
      return;
    }

    if (useSafePhoneFlow) {
      Alert.alert(
        t('wallet.openTmcelMenu', 'Open Tmcel Menu'),
        t('wallet.airtimeValidationModeBody', 'This device profile does not submit live airtime payments. Open the Tmcel menu to continue with the supported phone action.'),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: t('wallet.openTmcelMenu', 'Open Tmcel Menu'),
            onPress: async () => {
              await openTmcelMenu();
              onClose();
            },
          },
        ],
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
      const response = await buyAirtime({
        amount: numAmount,
        recipient_msisdn: recipientOption === 'other' ? recipientMsisdn.trim() : undefined,
        payment_provider: paymentProvider,
      }).unwrap();

      Alert.alert(
        t('common.success', 'Success'),
        t('wallet.airtimeSuccess', 'Successfully bought MZN {amount} airtime{recipient}')
          .replace('{amount}', String(numAmount))
          .replace('{recipient}', recipientOption === 'other' ? ` for ${recipientMsisdn}` : ' for yourself'),
        [{ text: 'OK', onPress: () => {
          setAmount('');
          setRecipientMsisdn('');
          setSelectedPreset(null);
          setPaymentProvider('emola');
          onClose();
        }}]
      );
    } catch (error: any) {
      if (isMissingMobileMoneyContract(error)) {
        Alert.alert(
          t('wallet.airtimeUnavailable', 'Airtime purchase is not available in this backend yet.'),
          t('wallet.airtimeFallbackBody', 'Open the Tmcel menu to continue with the supported phone action.'),
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: t('wallet.openTmcelMenu', 'Open Tmcel Menu'),
              onPress: async () => {
                await openTmcelMenu();
                onClose();
              },
            },
          ],
        );
        return;
      }
      const detailMsg = error?.data?.detail || error?.response?.data?.detail || error?.message || t('wallet.purchaseFailed', 'Purchase failed. Please try again.');
      Alert.alert(
        t('common.error', 'Error'),
        detailMsg
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24), maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(24) }}>
            <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary }}>
              {t('wallet.buyAirtime', 'Buy Airtime')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: ss(16), paddingBottom: ss(24) }}>
            {/* Recipient Selector Option */}
            <View style={{ flexDirection: 'row', backgroundColor: Colors.surface_container_high, borderRadius: ss(8), padding: ss(4) }}>
              <TouchableOpacity
                onPress={() => setRecipientOption('self')}
                style={{ flex: 1, paddingVertical: ss(8), alignItems: 'center', backgroundColor: recipientOption === 'self' ? '#ffffff' : 'transparent', borderRadius: ss(6) }}
              >
                <Text style={{ fontSize: ss(14), fontWeight: '600', color: Colors.primary }}>
                  {t('wallet.forSelf', 'For Myself')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRecipientOption('other')}
                style={{ flex: 1, paddingVertical: ss(8), alignItems: 'center', backgroundColor: recipientOption === 'other' ? '#ffffff' : 'transparent', borderRadius: ss(6) }}
              >
                <Text style={{ fontSize: ss(14), fontWeight: '600', color: Colors.primary }}>
                  {t('wallet.forOthers', 'For Someone Else')}
                </Text>
              </TouchableOpacity>
            </View>

            {recipientOption === 'other' && (
              <View>
                <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                  {t('wallet.recipientNumber', 'Recipient Phone Number')}
                </Text>
                <AppInput
                  placeholder="e.g. 821234567"
                  keyboardType="phone-pad"
                  value={recipientMsisdn}
                  onChangeText={setRecipientMsisdn}
                />
              </View>
            )}

            {/* Payment Method Selector */}
            <PaymentProviderSelector
              selected={paymentProvider}
              onChange={setPaymentProvider}
              eMolaBalance={eMolaBalance}
            />

            {/* Presets Grid */}
            <View>
              <Text style={{ marginBottom: ss(8), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.selectAmount', 'Select Amount')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ss(8) }}>
                {presets.map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => handlePresetSelect(val)}
                    style={{
                      paddingVertical: ss(10),
                      paddingHorizontal: ss(16),
                      borderRadius: ss(8),
                      borderWidth: 1.5,
                      borderColor: selectedPreset === val ? Colors.primary : Colors.outline_variant,
                      backgroundColor: selectedPreset === val ? Colors.surface_container_highest : '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: ss(14), fontWeight: '700', color: Colors.primary }}>
                      {val} MT
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Amount Input */}
            <View>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.customAmount', 'Custom Amount (MZN)')}
              </Text>
              <AppInput
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={handleAmountChange}
              />
            </View>

            <AppButton
              label={
                isLoading
                  ? 'Processing...'
                  : useSafePhoneFlow
                    ? t('wallet.openTmcelMenu', 'Open Tmcel Menu')
                    : t('wallet.buyVia', 'Buy via {provider}').replace('{provider}', paymentProvider === 'mkesh' ? 'mKesh' : 'eMola')
              }
              onPress={handlePurchase}
              disabled={isLoading}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
