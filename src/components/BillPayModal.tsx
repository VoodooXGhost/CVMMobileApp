import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X, ChevronDown } from 'lucide-react-native';
import { AppInput, AppButton } from './Primitives';
import { usePayBillMutation } from '../services/apiSlice';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import PaymentProviderSelector from './PaymentProviderSelector';
import { runtimeConfig } from '../config/runtime';
import { isMissingMobileMoneyContract, openTmcelMenu } from '../services/telephonyFallback';
import { isEmulatorLikeAndroidDevice } from '../services/deviceEnvironment';

interface BillPayModalProps {
  visible: boolean;
  onClose: () => void;
  eMolaBalance?: number;
}

export default function BillPayModal({ visible, onClose, eMolaBalance }: BillPayModalProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();
  const [billerCode, setBillerCode] = useState('EDM'); // Default to EDM (Electricity)
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [showBillerList, setShowBillerList] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'emola' | 'mkesh' | 'millennium_izi'>('emola');
  const [payBill, { isLoading }] = usePayBillMutation();
  // Only block virtual devices. Real phones in validation builds should still
  // exercise the live bill-payment path so UAT can validate end-to-end flows.
  const useSafePhoneFlow = isEmulatorLikeAndroidDevice();

  const billers = [
    { code: 'EDM', name: 'Electricidade de Moçambique' },
    { code: 'FIPAG', name: 'FIPAG (Water)' },
    { code: 'DSTV', name: 'DStv Mozambique' },
    { code: 'TVCABO', name: 'TV Cabo' },
    { code: 'TDM', name: 'Telecomunicações de Moçambique' },
  ];

  const handleSelectBiller = (code: string) => {
    setBillerCode(code);
    setShowBillerList(false);
  };

  const handlePay = async () => {
    const numAmount = parseFloat(amount);
    if (!reference.trim()) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterReference', 'Please enter a valid bill reference/contract number.'));
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterAmount', 'Please enter a valid payment amount.'));
      return;
    }

    if (useSafePhoneFlow) {
      Alert.alert(
        t('wallet.openTmcelMenu', 'Open Tmcel Menu'),
        t('wallet.paymentValidationModeBody', 'This device profile does not submit live bill payments. Open the Tmcel menu to continue with the supported phone action.'),
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
      const response = await payBill({
        biller_code: billerCode,
        amount: numAmount,
        reference: reference.trim(),
        payment_provider: paymentProvider,
      }).unwrap();

      Alert.alert(
        t('common.success', 'Success'),
        t('wallet.billSuccess', 'Successfully paid MZN {amount} to {biller}. Receipt: {receipt}')
          .replace('{amount}', String(numAmount))
          .replace('{biller}', billerCode)
          .replace('{receipt}', response.data?.receipt || ''),
        [{ text: 'OK', onPress: () => {
          setReference('');
          setAmount('');
          setPaymentProvider('emola');
          onClose();
        }}]
      );
    } catch (error: any) {
      if (isMissingMobileMoneyContract(error)) {
        Alert.alert(
          t('wallet.paymentUnavailable', 'Bill payment is not available in this backend yet.'),
          t('wallet.paymentFallbackBody', 'Open the Tmcel menu to continue with the supported phone action.'),
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
      Alert.alert(
        t('common.error', 'Error'),
        error?.data?.detail || error?.message || t('wallet.paymentFailed', 'Bill payment failed. Please try again.')
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24), maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(24) }}>
            <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary }}>
              {t('wallet.payBills', 'Pay Bills')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: ss(16), paddingBottom: ss(24) }}>
            {/* Biller Selector Dropdown */}
            <View style={{ zIndex: 10 }}>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.selectBiller', 'Select Biller Service')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowBillerList(!showBillerList)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: ss(14),
                  borderWidth: 1,
                  borderColor: Colors.outline,
                  borderRadius: ss(8),
                  backgroundColor: '#ffffff',
                }}
              >
                <Text style={{ fontSize: ss(14), fontWeight: '600', color: Colors.primary }}>
                  {billers.find((b) => b.code === billerCode)?.name || billerCode}
                </Text>
                <ChevronDown size={20} color={Colors.primary} />
              </TouchableOpacity>

              {showBillerList && (
                <View style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: Colors.outline,
                  borderRadius: ss(8),
                  marginTop: ss(4),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                  {billers.map((b) => (
                    <TouchableOpacity
                      key={b.code}
                      onPress={() => handleSelectBiller(b.code)}
                      style={{ padding: ss(14), borderBottomWidth: 1, borderBottomColor: Colors.outline_variant }}
                    >
                      <Text style={{ fontSize: ss(14), fontWeight: '500', color: Colors.primary }}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Payment Method Selector */}
            <PaymentProviderSelector
              selected={paymentProvider}
              onChange={setPaymentProvider}
              eMolaBalance={eMolaBalance}
            />

            {/* Reference Number */}
            <View>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.referenceNumber', 'Reference / Contract Number')}
              </Text>
              <AppInput
                placeholder="e.g. 142859201"
                keyboardType="numeric"
                value={reference}
                onChangeText={setReference}
              />
            </View>

            {/* Amount */}
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

            <AppButton
              label={
                isLoading
                  ? 'Processing...'
                  : useSafePhoneFlow
                    ? t('wallet.openTmcelMenu', 'Open Tmcel Menu')
                    : t('wallet.payVia', 'Pay via {provider}').replace('{provider}', paymentProvider === 'mkesh' ? 'mKesh' : 'eMola')
              }
              onPress={handlePay}
              disabled={isLoading}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
