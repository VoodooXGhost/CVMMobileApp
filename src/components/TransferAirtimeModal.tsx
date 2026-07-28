import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import axios from 'axios';
import { X } from 'lucide-react-native';
import { AppButton, AppInput } from './Primitives';
import { useI18n } from '../services/i18n';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { Colors } from '../theme/tokens';
import { ensureWalletAccess } from '../services/walletAccess';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { resolveLocalizedApiError } from '../services/apiErrors';
import { track } from '../services/analytics';
import { runtimeConfig, getZeroRateRequestHeaders } from '../config/runtime';
import { platformStorage } from '../services/storage';
import {
  useLazyGetAirtimeTransferStatusQuery,
} from '../services/apiSlice';

interface TransferAirtimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  airtimeBalance: number;
  senderMsisdn?: string;
}

const normalizeMsisdn = (value: string) => value.replace(/\D/g, '');

const makeIdempotencyKey = (senderMsisdn: string, recipientMsisdn: string, amount: number) => {
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `airtime-${normalizeMsisdn(senderMsisdn)}-${normalizeMsisdn(recipientMsisdn)}-${amount}-${Date.now()}-${randomSuffix}`;
};

const finalStatuses = new Set(['approved', 'rejected', 'unknown']);
const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const buildUrl = (path: string) => `${trimTrailingSlashes(runtimeConfig.apiUrl)}${path.startsWith('/') ? path : `/${path}`}`;

const normalizeTransferPayload = (response: any) => {
  const envelope = response?.data ?? response ?? {};
  const payload = envelope?.data ?? envelope;
  return {
    payload,
    transactionId: payload?.transaction_id ?? payload?.transactionId ?? envelope?.transaction_id ?? envelope?.transactionId,
    status: String(payload?.status ?? envelope?.status ?? 'pending').toLowerCase(),
  };
};

const submitAirtimeTransfer = async (body: { recipient_msisdn: string; amount: number; idempotency_key: string }) => {
  const accessToken = await platformStorage.getItemAsync('userToken');
  const walletToken = await ensureWalletAccess();
  const response = await axios.post(buildUrl('/api/v1/mobile/v1/airtime/transfers'), body, {
    timeout: 15_000,
    headers: {
      ...getZeroRateRequestHeaders(),
      Authorization: `Bearer ${accessToken}`,
      'X-Wallet-Token': walletToken,
    },
  });
  return response.data;
};

export default function TransferAirtimeModal({
  visible,
  onClose,
  onSuccess,
  airtimeBalance,
  senderMsisdn = '',
}: TransferAirtimeModalProps) {
  const { t } = useI18n();
  const { ss } = useResponsiveScale();
  const { authenticate } = useBiometricAuth();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [submittedReference, setSubmittedReference] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchStatus] = useLazyGetAirtimeTransferStatusQuery();

  const numericAmount = useMemo(() => Number(amount), [amount]);
  const remainingBalance = Number.isFinite(numericAmount)
    ? Math.max(airtimeBalance - numericAmount, 0)
    : airtimeBalance;

  const resetAndClose = () => {
    setRecipient('');
    setAmount('');
    setSubmittedReference(null);
    onSuccess?.();
    onClose();
  };

  const pollFinalStatus = async (transactionId: string) => {
    let lastStatus = 'pending';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetchStatus({ transactionId }).unwrap();
      const payload = response?.data ?? response ?? {};
      lastStatus = String(payload.status ?? payload.data?.status ?? lastStatus).toLowerCase();
      if (finalStatuses.has(lastStatus)) {
        return lastStatus;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return lastStatus;
  };

  const submitTransfer = async () => {
    const cleanRecipient = normalizeMsisdn(recipient);
    if (cleanRecipient.length < 9) {
      Alert.alert(t('common.error', 'Error'), t('wallet.airtimeTransferInvalidRecipient', 'Enter a valid Tmcel recipient number.'));
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert(t('common.error', 'Error'), t('wallet.enterAmount', 'Please enter a valid amount.'));
      return;
    }
    if (numericAmount > airtimeBalance) {
      Alert.alert(t('common.error', 'Error'), t('wallet.insufficientAirtime', 'You do not have enough airtime for this transfer.'));
      return;
    }

    Alert.alert(
      t('wallet.confirmAirtimeTransfer', 'Confirm Airtime Transfer'),
      t('wallet.airtimeTransferConfirmBody', 'Send {amount} MT airtime to {recipient}? Your remaining airtime will be {remaining} MT.')
        .replace('{amount}', String(numericAmount))
        .replace('{recipient}', recipient.trim())
        .replace('{remaining}', String(remainingBalance)),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.continue', 'Continue'),
          onPress: async () => {
            try {
              await track('airtime_transfer_confirm', { amount: numericAmount }, { screen: 'wallet' });
              const accepted = await authenticate(t('wallet.airtimeStepUpPrompt', 'Authenticate to transfer airtime.'));
              if (!accepted) {
                Alert.alert(
                  t('wallet.walletVerificationRequired', 'Wallet verification required'),
                  t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.'),
                );
                return;
              }
              setIsLoading(true);
              const idempotencyKey = makeIdempotencyKey(senderMsisdn, cleanRecipient, numericAmount);
              const response = await submitAirtimeTransfer({
                recipient_msisdn: cleanRecipient,
                amount: numericAmount,
                idempotency_key: idempotencyKey,
              });
              // CVM returns the final provider state in the submit response for UAT.
              // Treat that as authoritative instead of turning a later polling issue into a false failure.
              const { transactionId, status: submittedStatus } = normalizeTransferPayload(response);
              setSubmittedReference(transactionId ?? null);
              await track('airtime_transfer_submit', { transaction_id: transactionId, amount: numericAmount, status: submittedStatus }, { screen: 'wallet' });

              if (submittedStatus === 'approved') {
                await track('airtime_transfer_final', { transaction_id: transactionId, status: submittedStatus }, { screen: 'wallet' });
                Alert.alert(
                  t('common.success', 'Success'),
                  t('wallet.airtimeTransferSuccess', 'Airtime transfer completed successfully.'),
                  [{ text: 'OK', onPress: resetAndClose }],
                );
                return;
              }

              if (submittedStatus === 'rejected' || submittedStatus === 'unknown') {
                await track('airtime_transfer_final', { transaction_id: transactionId, status: submittedStatus }, { screen: 'wallet' });
                Alert.alert(t('common.error', 'Error'), t('wallet.airtimeTransferRejected', 'Airtime transfer was not approved.'));
                return;
              }

              if (!transactionId) {
                Alert.alert(t('wallet.airtimeTransferPending', 'Transfer submitted'), t('wallet.airtimeTransferPendingBody', 'The transfer was accepted but no status reference was returned.'));
                return;
              }

              let finalStatus = 'pending';
              try {
                finalStatus = await pollFinalStatus(transactionId);
              } catch (statusError: any) {
                await track('airtime_transfer_status_poll_fail', { transaction_id: transactionId, reason: statusError?.status || statusError?.message || 'unknown' }, { screen: 'wallet' });
                Alert.alert(t('wallet.airtimeTransferPending', 'Transfer pending'), t('wallet.airtimeTransferPendingBody', 'Tmcel has not returned a final status yet. Check transaction status before retrying.'));
                return;
              }
              await track('airtime_transfer_final', { transaction_id: transactionId, status: finalStatus }, { screen: 'wallet' });
              if (finalStatus === 'approved') {
                Alert.alert(
                  t('common.success', 'Success'),
                  t('wallet.airtimeTransferSuccess', 'Airtime transfer completed successfully.'),
                  [{ text: 'OK', onPress: resetAndClose }],
                );
                return;
              }
              if (finalStatus === 'pending') {
                Alert.alert(t('wallet.airtimeTransferPending', 'Transfer pending'), t('wallet.airtimeTransferPendingBody', 'Tmcel has not returned a final status yet. Check transaction status before retrying.'));
                return;
              }
              Alert.alert(t('common.error', 'Error'), t('wallet.airtimeTransferRejected', 'Airtime transfer was not approved.'));
            } catch (error: any) {
              await track('airtime_transfer_fail', { reason: error?.status || error?.message || 'unknown' }, { screen: 'wallet' });
              console.warn('[mobile] airtime transfer failed', JSON.stringify({
                status: error?.response?.status ?? error?.status,
                message: error?.message,
                data: error?.response?.data ?? error?.data,
              }));
              Alert.alert(
                t('common.error', 'Error'),
                resolveLocalizedApiError(t, error, t('wallet.airtimeTransferFailed', 'Airtime transfer failed. Please try again.')),
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24), maxHeight: '82%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(24) }}>
            <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary }}>
              {t('wallet.transferAirtime', 'Transfer Airtime')}
            </Text>
            <TouchableOpacity onPress={resetAndClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: ss(16), paddingBottom: ss(24) }}>
            <View style={{ borderWidth: 1, borderColor: Colors.outline_variant, borderRadius: ss(12), padding: ss(14) }}>
              <Text style={{ color: Colors.on_surface_variant, fontSize: ss(12), fontWeight: '700', textTransform: 'uppercase' }}>
                {t('wallet.airtimeBalance', 'Airtime Balance')}
              </Text>
              <Text style={{ color: Colors.primary, fontSize: ss(28), fontWeight: '800', marginTop: ss(4) }}>
                {airtimeBalance.toFixed(2)} MT
              </Text>
            </View>

            <View>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.recipientNumber', 'Recipient Phone Number')}
              </Text>
              <AppInput
                placeholder="e.g. +258833499955"
                keyboardType="phone-pad"
                value={recipient}
                onChangeText={setRecipient}
              />
            </View>

            <View>
              <Text style={{ marginBottom: ss(6), color: Colors.on_surface_variant, fontSize: ss(14), fontWeight: '600' }}>
                {t('wallet.airtimeAmount', 'Airtime Amount (MT)')}
              </Text>
              <AppInput
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={{ backgroundColor: Colors.surface_container_high, borderRadius: ss(10), padding: ss(12) }}>
              <Text style={{ color: Colors.on_surface_variant, fontSize: ss(13), lineHeight: ss(19) }}>
                {t('wallet.airtimeTransferSummary', 'This transfers airtime from your carrier airtime balance. eMola and mKesh balances are not used.')}
              </Text>
              <Text style={{ color: Colors.primary, fontSize: ss(13), fontWeight: '700', marginTop: ss(8) }}>
                {t('wallet.remainingAirtime', 'Remaining airtime')}: {remainingBalance.toFixed(2)} MT
              </Text>
              {submittedReference ? (
                <Text style={{ color: Colors.on_surface_variant, fontSize: ss(12), marginTop: ss(6) }}>
                  {t('wallet.reference', 'Reference')}: {submittedReference}
                </Text>
              ) : null}
            </View>

            <AppButton
              label={isLoading ? t('wallet.processing', 'Processing...') : t('wallet.confirmTransferAirtime', 'Confirm Transfer Airtime')}
              onPress={submitTransfer}
              disabled={isLoading}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
