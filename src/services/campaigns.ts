import { Alert, Linking, Platform } from 'react-native';
import { platformStorage } from './storage';

export type CampaignActionType = 'ussd' | 'dial' | 'sms' | 'web' | 'deeplink';
export type CampaignLastActionStatus = 'idle' | 'success' | 'failed' | 'pending';

export interface CampaignActionPayload {
  ussd?: string;
  dial_code?: string;
  phone_number?: string;
  recipient?: string;
  sms_body?: string;
  url?: string;
  deep_link?: string;
  fallback_label?: string;
  [key: string]: any;
}

export interface CampaignItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  priority: string;
  expiry: string;
  eligibility: string;
  cta_label: string;
  action_type: CampaignActionType;
  action_payload: CampaignActionPayload;
  saved: boolean;
  last_action_status: CampaignLastActionStatus;
}

const CAMPAIGN_CACHE_KEY = 'campaign_feed_cache_v1';
const CAMPAIGN_FAVORITES_KEY = 'campaign_favorites_v1';
const CAMPAIGN_STATUS_KEY = 'campaign_last_actions_v1';

const safeParse = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

export const normalizeCampaignItem = (item: any, index = 0): CampaignItem => ({
  id: String(item?.id ?? `campaign-${index + 1}`),
  title: String(item?.title ?? item?.name ?? `Campaign ${index + 1}`),
  summary: String(item?.summary ?? item?.description ?? ''),
  category: String(item?.category ?? 'Campaign'),
  priority: String(item?.priority ?? 'normal'),
  expiry: String(item?.expiry ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
  eligibility: String(item?.eligibility ?? 'Available to eligible subscribers.'),
  cta_label: String(item?.cta_label ?? 'Open'),
  action_type: String(item?.action_type ?? 'web') as CampaignActionType,
  action_payload: item?.action_payload && typeof item.action_payload === 'object' ? item.action_payload : {},
  saved: Boolean(item?.saved ?? false),
  last_action_status: (item?.last_action_status as CampaignLastActionStatus) ?? 'idle',
});

export const normalizeCampaignFeed = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const campaigns = Array.isArray(source.campaigns)
    ? source.campaigns.map((campaign: any, index: number) => normalizeCampaignItem(campaign, index))
    : [];
  const categories = Array.from(new Set(campaigns.map((item) => item.category).filter(Boolean)));
  return {
    campaigns,
    categories,
    source: String(source.source ?? 'live'),
  };
};

export const loadCampaignCache = async () => {
  const cached = safeParse(await platformStorage.getItemAsync(CAMPAIGN_CACHE_KEY));
  return cached ? normalizeCampaignFeed(cached) : null;
};

export const saveCampaignCache = async (feed: any) => {
  await platformStorage.setItemAsync(CAMPAIGN_CACHE_KEY, JSON.stringify(feed));
};

export const loadCampaignFavorites = async (): Promise<Record<string, boolean>> => {
  const cached = safeParse(await platformStorage.getItemAsync(CAMPAIGN_FAVORITES_KEY));
  return cached && typeof cached === 'object' ? cached : {};
};

export const saveCampaignFavorites = async (favorites: Record<string, boolean>) => {
  await platformStorage.setItemAsync(CAMPAIGN_FAVORITES_KEY, JSON.stringify(favorites));
};

export const loadCampaignStatuses = async (): Promise<Record<string, CampaignLastActionStatus>> => {
  const cached = safeParse(await platformStorage.getItemAsync(CAMPAIGN_STATUS_KEY));
  return cached && typeof cached === 'object' ? cached : {};
};

export const saveCampaignStatus = async (campaignId: string, status: CampaignLastActionStatus) => {
  const current = await loadCampaignStatuses();
  current[String(campaignId)] = status;
  await platformStorage.setItemAsync(CAMPAIGN_STATUS_KEY, JSON.stringify(current));
};

const encodeUssd = (value: string) => value.trim().replace(/#/g, '%23');

export const getCampaignActionPreview = (campaign: CampaignItem) => {
  const payload = campaign.action_payload || {};
  switch (campaign.action_type) {
    case 'ussd':
      return payload.ussd ? `USSD ${payload.ussd}` : 'USSD action';
    case 'dial':
      return payload.dial_code || payload.phone_number || 'Dialer handoff';
    case 'sms':
      return payload.recipient || payload.phone_number || 'SMS action';
    case 'deeplink':
    case 'web':
      return payload.url || payload.deep_link || 'Open link';
    default:
      return campaign.cta_label;
  }
};

export const buildCampaignActionUri = (campaign: CampaignItem) => {
  const payload = campaign.action_payload || {};
  switch (campaign.action_type) {
    case 'ussd': {
      const ussd = String(payload.ussd || payload.dial_code || '').trim();
      if (!ussd) return null;
      return `tel:${encodeUssd(ussd)}`;
    }
    case 'dial': {
      const dial = String(payload.phone_number || payload.dial_code || '').trim();
      if (!dial) return null;
      return `tel:${dial}`;
    }
    case 'sms': {
      const recipient = String(payload.recipient || payload.phone_number || '').trim();
      if (!recipient) return null;
      const smsBody = payload.sms_body ? `?body=${encodeURIComponent(String(payload.sms_body))}` : '';
      return `sms:${recipient}${smsBody}`;
    }
    case 'deeplink':
    case 'web':
      return String(payload.url || payload.deep_link || '').trim() || null;
    default:
      return null;
  }
};

export const launchCampaignAction = async (campaign: CampaignItem) => {
  const uri = buildCampaignActionUri(campaign);
  if (!uri) {
    throw new Error('Campaign action is missing a launch target.');
  }

  const fallbackUri =
    campaign.action_type === 'ussd'
      ? `tel:${String(campaign.action_payload?.dial_code || campaign.action_payload?.ussd || '').replace(/#/g, '%23')}`
      : null;

  const canOpen = await Linking.canOpenURL(uri);
  if (!canOpen && fallbackUri) {
    const fallbackCanOpen = await Linking.canOpenURL(fallbackUri);
    if (fallbackCanOpen) {
      await Linking.openURL(fallbackUri);
      return { success: true, uri: fallbackUri, usedFallback: true };
    }
  }

  if (!canOpen && Platform.OS !== 'web') {
    throw new Error('This device cannot open the requested campaign action.');
  }

  await Linking.openURL(uri);
  return { success: true, uri, usedFallback: false };
};

export const confirmCampaignLaunch = (title: string, body: string, onConfirm: () => void) => {
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', onPress: onConfirm },
  ]);
};
