import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { AppInput, AppButton } from './Primitives';
import { useBuyAirtimeMutation, useGetBundlesDataQuery, useLazyGetTransactionStatusQuery } from '../services/apiSlice';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import PaymentProviderSelector from './PaymentProviderSelector';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { resolveLocalizedApiError } from '../services/apiErrors';
import { ensureWalletAccess } from '../services/walletAccess';

interface BuyAirtimeModalProps {
  visible: boolean;
  onClose: () => void;
  eMolaBalance?: number;
  mKeshBalance?: number;
}

export default function BuyAirtimeModal({ visible, onClose, eMolaBalance, mKeshBalance }: BuyAirtimeModalProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();
  const [recipientOption, setRecipientOption] = useState<'self' | 'other'>('self');
  const [recipientMsisdn, setRecipientMsisdn] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [selectedPackageRef, setSelectedPackageRef] = useState<number | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'emola' | 'mkesh' | 'millennium_izi'>('emola');
  const [buyAirtime, { isLoading }] = useBuyAirtimeMutation();
  const [fetchTransactionStatus] = useLazyGetTransactionStatusQuery();
  const { data: bundleResponse } = useGetBundlesDataQuery();

  const bundles = Array.isArray(bundleResponse?.data?.bundles) ? bundleResponse.data.bundles : [];
  const presets = bundles.length > 0
    ? bundles
        .filter((bundle: any) => Number.isFinite(Number(bundle.amount)) && Number(bundle.amount) > 0)
        .slice(0, 6)
    : [20, 50, 100, 200, 500].map((value) => ({
        id: `preset-${value}`,
        packageRef: null,
        title: `${value} MT`,
        amount: value,
      }));

  const handlePresetSelect = (bundle: any) => {
    const numericAmount = Number(bundle.amount);
    setSelectedPreset(numericAmount);
    setSelectedPackageRef(Number.isFinite(Number(bundle.packageRef)) ? Number(bundle.packageRef) : null);
    setAmount(String(numericAmount));
  };

  const handleAmountChange = (text: string) => {
    setSelectedPreset(null);
    setSelectedPackageRef(null);
    setAmount(text);
  };

  const { authenticate } = useBiometricAuth();

  const normalizePurchaseResult = (response: any) => {
    const envelope = response?.data ?? response ?? {};
    const payload = envelope?.data ?? envelope;
    return {
      transactionId: payload?.transaction_id ?? payload?.transactionId ?? payload?.id ?? envelope?.transaction_id,
      status: String(payload?.status ?? envelope?.status ?? 'approved').toLowerCase(),
      detail: payload?.detail ?? envelope?.detail,
    };
  };

  const pollFinalStatus = async (transactionId: string) => {
    let lastStatus = 'pending';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const statusResponse = await fetchTransactionStatus({ transactionId }).unwrap();
      const normalized = normalizePurchaseResult(statusResponse);
      lastStatus = normalized.status;
      if (['approved', 'successful', 'success', 'rejected', 'failed'].includes(lastStatus)) {
        return lastStatus;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return lastStatus;
  };

  useEffect(() => {
    if (!visible) return;
    const hasEmolaFunds = typeof eMolaBalance === 'number' && eMolaBalance > 0;
    const hasMkeshFunds = typeof mKeshBalance === 'number' && mKeshBalance > 0;
    if (!hasEmolaFunds && hasMkeshFunds) {
      setPaymentProvider('mkesh');
    }
  }, [visible, eMolaBalance, mKeshBalance]);

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

    try {
      const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending YM.'));
      if (!accepted) {
        Alert.alert(
          t('wallet.walletVerificationRequired', 'Wallet verification required'),
          t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
        );
        return;
      }
      const walletToken = await ensureWalletAccess();
      const response = await buyAirtime({
        amount: numAmount,
        recipient_msisdn: recipientOption === 'other' ? recipientMsisdn.trim() : undefined,
        payment_provider: paymentProvider,
        package_ref: selectedPackageRef ?? undefined,
        wallet_token: walletToken,
      }).unwrap();
      const purchase = normalizePurchaseResult(response);

      if (['pending', 'queued', 'approval_required'].includes(purchase.status)) {
        if (purchase.transactionId) {
          const finalStatus = await pollFinalStatus(purchase.transactionId);
          if (['approved', 'successful', 'success'].includes(finalStatus)) {
            Alert.alert(
              t('common.success', 'Success'),
              t('wallet.airtimeSuccess', 'Successfully bought MZN {amount} airtime{recipient}')
                .replace('{amount}', String(numAmount))
                .replace('{recipient}', recipientOption === 'other' ? ` for ${recipientMsisdn}` : ' for yourself'),
              [{ text: 'OK', onPress: () => {
                setAmount('');
                setRecipientMsisdn('');
                setSelectedPreset(null);
                setSelectedPackageRef(null);
                setPaymentProvider('emola');
                onClose();
              }}]
            );
            return;
          }
          if (['rejected', 'failed'].includes(finalStatus)) {
            Alert.alert(t('common.error', 'Error'), t('wallet.airtimeRejected', 'Airtime purchase was not approved.'));
            return;
          }
        }
        Alert.alert(
          t('wallet.airtimePendingApproval', 'Pending approval'),
          t('wallet.airtimePendingApprovalBody', 'Approve the mKesh request on your phone. The app will show the final result once Tmcel confirms it.'),
        );
        return;
      }

      Alert.alert(
        t('common.success', 'Success'),
        t('wallet.airtimeSuccess', 'Successfully bought MZN {amount} airtime{recipient}')
          .replace('{amount}', String(numAmount))
          .replace('{recipient}', recipientOption === 'other' ? ` for ${recipientMsisdn}` : ' for yourself'),
        [{ text: 'OK', onPress: () => {
          setAmount('');
          setRecipientMsisdn('');
          setSelectedPreset(null);
          setSelectedPackageRef(null);
          setPaymentProvider('emola');
          onClose();
        }}]
      );
    } catch (error: any) {
      const detailMsg = resolveLocalizedApiError(
        t,
        error,
        t('wallet.purchaseFailed', 'Purchase failed. Please try again.'),
      );
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
              mKeshBalance={mKeshBalance}
            />

            {/* Presets Grid */}
            <View>
              <Text style={{ marginBottom: ss(8), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {bundles.length > 0 ? t('wallet.selectBundle', 'Select Bundle') : t('wallet.selectAmount', 'Select Amount')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ss(8) }}>
                {presets.map((bundle: any) => (
                  <TouchableOpacity
                    key={String(bundle.id)}
                    onPress={() => handlePresetSelect(bundle)}
                    style={{
                      paddingVertical: ss(10),
                      paddingHorizontal: ss(16),
                      borderRadius: ss(8),
                      borderWidth: 1.5,
                      borderColor: selectedPreset === Number(bundle.amount) ? Colors.primary : Colors.outline_variant,
                      backgroundColor: selectedPreset === Number(bundle.amount) ? Colors.surface_container_highest : '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: ss(14), fontWeight: '700', color: Colors.primary }}>
                      {Number(bundle.amount)} MT
                    </Text>
                    {bundles.length > 0 && (
                      <Text style={{ fontSize: ss(10), fontWeight: '500', color: Colors.on_surface_variant, marginTop: ss(2) }}>
                        {String(bundle.title).slice(0, 22)}
                      </Text>
                    )}
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
