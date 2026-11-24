import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  CampaignItem,
  performCampaignUssdHandoff,
} from '../services/campaigns';
import {
  useCreateCampaignActionAttemptMutation,
  useUpdateCampaignActionAttemptMutation,
} from '../services/apiSlice';
import { useI18n } from '../services/i18n';
import { track } from '../services/analytics';

/** Confirms customer intent, records it in CVM, then opens only CVM-approved USSD. */
export const useCampaignUssdAction = (screen: 'home' | 'marketplace') => {
  const { t } = useI18n();
  const [createAttempt] = useCreateCampaignActionAttemptMutation();
  const [updateAttempt] = useUpdateCampaignActionAttemptMutation();

  const confirm = useCallback((item: CampaignItem) => {
    if (!item.customer_action_enabled || item.action_type !== 'ussd') return;
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    const continueToPhoneMenu = async () => {
      try {
        await performCampaignUssdHandoff(item, {
          createAttempt: (body) => createAttempt(body).unwrap(),
          updateAttempt: (attemptId, body) =>
            updateAttempt({ attemptId, status: body.status }).unwrap(),
          openURL: (uri) => Linking.openURL(uri),
          idempotencyKey,
        });
        track(
          'campaign_ussd_handoff_requested',
          { item_id: item.id, item_kind: item.item_kind ?? 'campaign' },
          { screen, placement: 'campaign_details' },
        );
        Alert.alert(
          t('common.done', 'Done'),
          t('campaign.ussdHandoffOpened', 'The Tmcel phone menu was opened. Follow its instructions to continue. This app cannot confirm whether the offer was activated.'),
        );
      } catch (error: any) {
        if (error?.campaignActionStage === 'record') {
          Alert.alert(
            t('common.error', 'Error'),
            t('campaign.ussdAttemptRecordFailed', 'We could not record your request with CVM, so the phone menu was not opened. Retry?'),
            [
              { text: t('common.cancel', 'Cancel'), style: 'cancel' },
              { text: t('common.retry', 'Retry'), onPress: () => { void continueToPhoneMenu(); } },
            ],
          );
          return;
        }
        Alert.alert(
          t('common.error', 'Error'),
          t('campaign.ussdHandoffFailed', 'The phone menu could not be opened. No purchase was confirmed.'),
        );
      }
    };

    Alert.alert(
      t('campaign.confirmUssdTitle', 'Continue in the Tmcel phone menu?'),
      t('campaign.confirmUssdBody', 'This action will open the Tmcel phone menu. The app will record your confirmed attempt first. Opening the menu does not confirm a purchase or activation.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('campaign.continueToUssd', 'Continue to phone menu'), onPress: () => { void continueToPhoneMenu(); } },
      ],
    );
  }, [createAttempt, screen, t, updateAttempt]);

  return confirm;
};
