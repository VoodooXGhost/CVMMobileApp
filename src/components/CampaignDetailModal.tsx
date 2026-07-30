import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View, Text, Modal, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { AppButton } from './Primitives';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { useI18n } from '../services/i18n';
import { Colors } from '../theme/tokens';
import { CampaignItem } from '../services/campaigns';
import PaymentProviderSelector from './PaymentProviderSelector';
import { useBiometricAuth } from '../hooks/useBiometricAuth';
import { ensureWalletAccess } from '../services/walletAccess';
import {
  useGetEMolaWalletQuery,
  useLazyGetTransactionStatusQuery,
  usePurchaseCampaignOfferMutation,
} from '../services/apiSlice';
import { resolveLocalizedApiError } from '../services/apiErrors';
import { formatMznCurrency } from '../services/formatters';
import { track } from '../services/analytics';

interface CampaignDetailModalProps {
  visible: boolean;
  onClose: () => void;
  campaign: CampaignItem | null;
  onCustomerAction?: (campaign: CampaignItem) => void;
  onPurchaseComplete?: () => Promise<void> | void;
}

export default function CampaignDetailModal({ visible, onClose, campaign, onCustomerAction, onPurchaseComplete }: CampaignDetailModalProps) {
  const { language, t } = useI18n();
  const { ss } = useResponsiveScale();
  const [paymentProvider, setPaymentProvider] = useState<'emola' | 'mkesh' | 'millennium_izi'>('emola');
  const [purchaseCampaignOffer, { isLoading }] = usePurchaseCampaignOfferMutation();
  const [fetchTransactionStatus] = useLazyGetTransactionStatusQuery();
  const { authenticate } = useBiometricAuth();
  const { data: walletResponse } = useGetEMolaWalletQuery(undefined, { skip: !visible });

  useEffect(() => {
    if (visible) {
      setPaymentProvider('emola');
    }
  }, [visible, campaign?.id]);

  if (!campaign) return null;

  const walletData = walletResponse?.data ?? walletResponse ?? {};
  const eMolaBalance = Number(walletData?.eMolaBalance ?? walletData?.balance ?? 0);
  const mKeshBalance = Number(walletData?.mKeshBalance ?? walletData?.mkeshBalance ?? 0);
  const hasPurchaseAction = campaign.is_purchasable === true;
  const hasCustomerAction = hasPurchaseAction || (campaign.customer_action_enabled && Boolean(onCustomerAction));

  const normalizePurchaseResult = (response: any) => {
    const envelope = response?.data ?? response ?? {};
    const payload = envelope?.data ?? envelope;
    return {
      transactionId: payload?.transaction_id ?? payload?.transactionId ?? payload?.id ?? envelope?.transaction_id,
      status: String(payload?.status ?? envelope?.status ?? 'approved').toLowerCase(),
      reference: payload?.reference ?? payload?.provider_reference ?? payload?.providerReference,
      providerReference: payload?.provider_reference ?? payload?.providerReference,
      mbcReference: payload?.mbc_reference ?? payload?.mbcReference,
      message: payload?.message ?? payload?.detail ?? envelope?.detail,
    };
  };

  const pollFinalStatus = async (transactionId: string) => {
    let lastResult = { status: 'pending' } as ReturnType<typeof normalizePurchaseResult>;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const statusResponse = await fetchTransactionStatus({ transactionId }).unwrap();
      const normalized = normalizePurchaseResult(statusResponse);
      lastResult = normalized;
      if (['approved', 'successful', 'success', 'rejected', 'failed', 'timeout'].includes(normalized.status)) {
        return normalized;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return lastResult;
  };

  const handlePurchase = async () => {
    if (!hasPurchaseAction || !campaign.purchase_package_ref || !campaign.purchase_amount) {
      Alert.alert(t('marketplace.unavailable', 'Unavailable'), t('campaign.purchaseUnavailable', 'This offer cannot be purchased right now.'));
      return;
    }

    const amount = campaign.purchase_amount;
    const prompt = t('campaign.purchasePrompt', 'Buy {title} for {amount}?')
      .replace('{title}', campaign.title)
      .replace('{amount}', formatMznCurrency(amount, language));

    Alert.alert(t('campaign.confirmPurchase', 'Confirm Offer Purchase'), prompt, [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('marketplace.buy', 'Buy'),
        onPress: async () => {
          try {
            await track('campaign_purchase_start', { campaign_id: campaign.id, amount, provider: paymentProvider }, { screen: 'campaign_detail' });
            const accepted = await authenticate(t('wallet.stepUpPrompt', 'Authenticate to continue spending.'));
            if (!accepted) {
              return;
            }
            const walletToken = await ensureWalletAccess();
            const idempotencyKey = `campaign-${campaign.id}-${campaign.purchase_package_ref}-${amount}-${Date.now()}`;
            const response = await purchaseCampaignOffer({
              campaignId: campaign.id,
              packageRef: campaign.purchase_package_ref,
              amount,
              paymentProvider,
              idempotencyKey,
              wallet_token: walletToken,
            }).unwrap();
            await track('campaign_purchase_submit', { campaign_id: campaign.id, amount, provider: paymentProvider }, { screen: 'campaign_detail' });

            let purchase = normalizePurchaseResult(response);
            if (['pending', 'queued', 'approval_required'].includes(purchase.status) && purchase.transactionId) {
              await track('campaign_purchase_pending', { campaign_id: campaign.id, transaction_id: purchase.transactionId }, { screen: 'campaign_detail' });
              purchase = await pollFinalStatus(purchase.transactionId);
            }

            if (['approved', 'successful', 'success'].includes(purchase.status)) {
              await onPurchaseComplete?.();
              await track('campaign_purchase_success', { campaign_id: campaign.id, transaction_id: purchase.transactionId }, { screen: 'campaign_detail' });
              const reference = purchase.reference || purchase.providerReference || purchase.transactionId;
              Alert.alert(
                t('common.success', 'Success'),
                reference
                  ? t('campaign.purchaseSuccessWithReference', 'Offer purchased successfully. Reference: {reference}').replace('{reference}', String(reference))
                  : t('campaign.purchaseSuccess', 'Offer purchased successfully.'),
                [{ text: 'OK', onPress: onClose }],
              );
              return;
            }

            if (['pending', 'queued', 'approval_required'].includes(purchase.status)) {
              Alert.alert(
                t('campaign.purchasePending', 'Purchase pending'),
                t('campaign.purchasePendingBody', 'Approve the request on your phone. The app will show the final result once Tmcel confirms it.'),
              );
              return;
            }

            await track('campaign_purchase_fail', { campaign_id: campaign.id, status: purchase.status }, { screen: 'campaign_detail' });
            Alert.alert(t('common.error', 'Error'), t('campaign.purchaseRejected', 'Offer purchase was not approved.'));
          } catch (error: any) {
            await track('campaign_purchase_fail', { campaign_id: campaign.id, reason: error?.status || error?.message || 'unknown' }, { screen: 'campaign_detail' });
            Alert.alert(
              t('common.error', 'Error'),
              resolveLocalizedApiError(t, error, t('campaign.purchaseFailed', 'Failed to purchase offer.')),
            );
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: ss(24), borderTopRightRadius: ss(24), padding: ss(24), maxHeight: '86%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: ss(20) }}>
            <Text style={{ fontSize: ss(18), fontWeight: '700', color: Colors.primary }}>
              {t('campaign.details', 'Campaign / Offer Details')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: ss(20), fontWeight: '700', color: Colors.primary, marginBottom: ss(8) }}>
              {campaign.title}
            </Text>

            <Text style={{ fontSize: ss(14), color: Colors.on_surface, marginBottom: ss(16), lineHeight: ss(20) }}>
              {campaign.summary}
            </Text>

            <View style={{ backgroundColor: Colors.surface_container_high, borderRadius: ss(12), padding: ss(16), gap: ss(12), marginBottom: ss(16) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: ss(12) }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.category', 'Category')}
              </Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {campaign.category}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.eligibility', 'Eligibility')}
              </Text>
              <Text style={{ flex: 1, textAlign: 'right', fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {campaign.eligibility}
              </Text>
            </View>
            {campaign.benefit ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: ss(12) }}>
                <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                  {t('campaign.benefit', 'Benefit')}
                </Text>
                <Text style={{ flex: 1, textAlign: 'right', fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                  {campaign.benefit}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: ss(12), fontWeight: '600', color: Colors.on_surface_variant }}>
                {t('campaign.expires', 'Expires On')}
              </Text>
              <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                {new Date(campaign.expiry).toLocaleDateString()}
              </Text>
            </View>
            </View>

            {hasPurchaseAction ? (
              <View style={{ marginBottom: ss(20), gap: ss(12) }}>
                <View style={{ backgroundColor: Colors.surface_container_high, borderRadius: ss(12), padding: ss(16), gap: ss(8) }}>
                  <Text style={{ fontSize: ss(12), fontWeight: '700', color: Colors.primary }}>
                    {t('campaign.purchaseSummary', 'Purchase Summary')}
                  </Text>
                  <Text style={{ fontSize: ss(12), color: Colors.on_surface_variant }}>
                    {t('campaign.packageRef', 'Package')}: {campaign.purchase_package_ref}
                  </Text>
                  <Text style={{ fontSize: ss(12), color: Colors.on_surface_variant }}>
                    {t('campaign.amount', 'Amount')}: {formatMznCurrency(campaign.purchase_amount ?? 0, language)}
                  </Text>
                </View>
                <PaymentProviderSelector
                  selected={paymentProvider}
                  onChange={setPaymentProvider}
                  eMolaBalance={eMolaBalance}
                  mKeshBalance={mKeshBalance}
                />
              </View>
            ) : null}

            {hasCustomerAction ? (
              <AppButton
                label={isLoading ? t('wallet.processing', 'Processing...') : campaign.cta_label}
                onPress={hasPurchaseAction ? handlePurchase : () => onCustomerAction?.(campaign)}
                disabled={isLoading}
              />
            ) : (
              <AppButton label={t('common.close', 'Close')} onPress={onClose} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
