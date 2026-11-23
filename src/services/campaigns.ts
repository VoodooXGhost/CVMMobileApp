import { Alert, Linking, Platform } from 'react-native';
import { platformStorage } from './storage';

export type CampaignActionType = 'none' | 'ussd' | 'dial' | 'sms' | 'web' | 'deeplink' | 'purchase';
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
  packageRef?: string | number;
  package_ref?: string | number;
  amount?: number;
  allowedPaymentProviders?: string[];
  [key: string]: any;
}

export interface CampaignItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  priority: string;
  status: string;
  expiry: string;
  eligibility: string;
  customer_eligible: boolean | null;
  benefit: string;
  cta_label: string;
  action_type: CampaignActionType;
  action_payload: CampaignActionPayload;
  customer_action_enabled: boolean;
  is_purchasable: boolean;
  purchase_package_ref?: string;
  purchase_amount?: number;
  allowed_payment_providers: Array<'emola' | 'mkesh'>;
  saved: boolean;
  last_action_status: CampaignLastActionStatus;
}

const CAMPAIGN_CACHE_KEY = 'campaign_feed_cache_v2';
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

const ACTIVE_STATUSES = new Set(['active', 'running', 'available', 'live']);
const HIDDEN_STATUSES = new Set(['scheduled', 'draft', 'paused', 'expired', 'internal', 'test', 'inactive', 'archived']);
const LIFECYCLE_STATUSES = new Set([...ACTIVE_STATUSES, ...HIDDEN_STATUSES]);

const safeText = (value: any, fallback = ''): string => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((entry) => safeText(entry, '')).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    return (
      safeText(value.label, '') ||
      safeText(value.name, '') ||
      safeText(value.title, '') ||
      safeText(value.text, '') ||
      safeText(value.description, '') ||
      safeText(value.summary, '') ||
      safeText(value.message, '') ||
      fallback
    );
  }
  return fallback;
};

const safeObject = (value: any): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const normalizeStatus = (item: any) => {
  const suppliedStatus = safeText(
    item?.mobile_status ?? item?.campaign_status ?? item?.lifecycle_status ?? item?.status ?? item?.state,
    '',
  ).toLowerCase();
  if (suppliedStatus) return suppliedStatus;

  // Some CVM feeds use `type` for lifecycle state; accept only known lifecycle tokens.
  const typeStatus = safeText(item?.type, '').toLowerCase();
  return LIFECYCLE_STATUSES.has(typeStatus) ? typeStatus : '';
};

const isNotExpiredOrScheduled = (item: any) => {
  const expiry = item?.expiry ?? item?.expires_at ?? item?.end_date;
  if (expiry) {
    const expiryTime = new Date(expiry).getTime();
    if (Number.isFinite(expiryTime) && expiryTime < Date.now()) return false;
  }

  const startsAt = item?.starts_at ?? item?.start_at ?? item?.start_date;
  if (startsAt) {
    const startTime = new Date(startsAt).getTime();
    if (Number.isFinite(startTime) && startTime > Date.now()) return false;
  }
  return true;
};

const hasCustomerVisibility = (item: any) =>
  item?.visible_to_mobile !== false &&
  item?.customer_visible !== false &&
  item?.mobile_visible !== false &&
  item?.internal !== true &&
  item?.test !== true;

export const isCustomerVisibleOffer = (item: any) => {
  const status = normalizeStatus(item);
  const activeFlag = item?.is_active === true || item?.active === true;
  return (
    hasCustomerVisibility(item) &&
    item?.is_active !== false &&
    item?.active !== false &&
    (ACTIVE_STATUSES.has(status) || (!status && activeFlag)) &&
    isNotExpiredOrScheduled(item)
  );
};

export const normalizeCustomerOffers = (items: any[]) =>
  (Array.isArray(items) ? items : []).filter(isCustomerVisibleOffer);

const normalizeEligibility = (item: any): boolean | null => {
  const eligibility = safeText(item?.eligibility ?? item?.eligibility_label ?? item?.eligibility_status, '').toLowerCase();
  if (item?.is_eligible === true || item?.eligible === true) return true;
  if (item?.is_eligible === false || item?.eligible === false) return false;
  if (/not eligible|ineligible|not part of (the )?target segment|subscriber.*not (in|part)/.test(eligibility)) return false;
  if (['eligible', 'qualified', 'matched'].includes(eligibility)) return true;
  return null;
};

const resolveCustomerActionEnabled = (item: any) => {
  const customerAction = safeObject(item?.customer_action);
  return Boolean(
    item?.customer_action_enabled === true ||
      item?.mobile_action_enabled === true ||
      customerAction.enabled === true ||
      customerAction.customer_safe === true,
  );
};

export const isCustomerVisibleCampaign = (item: any) => {
  const status = normalizeStatus(item);
  const activeFlag = item?.is_active === true || item?.active === true;
  const isExplicitlyHidden = !hasCustomerVisibility(item) || item?.is_active === false || item?.active === false || HIDDEN_STATUSES.has(status);

  if (isExplicitlyHidden) return false;
  return (ACTIVE_STATUSES.has(status) || (!status && activeFlag)) && isNotExpiredOrScheduled(item);
};

export const normalizeCampaignItem = (item: any, index = 0): CampaignItem => {
  const customerAction = safeObject(item?.customer_action);
  const actionPayload = safeObject(item?.action_payload ?? customerAction.payload);
  const actionEnabled = resolveCustomerActionEnabled(item);
  const actionType = actionEnabled
    ? (safeText(customerAction.type ?? item?.action_type, 'none') as CampaignActionType)
    : 'none';
  const purchasePackageRef = safeText(actionPayload.packageRef ?? actionPayload.package_ref, '');
  const purchaseAmount = Number(actionPayload.amount ?? actionPayload.price ?? 0);
  const allowedProviders = Array.isArray(actionPayload.allowedPaymentProviders)
    ? actionPayload.allowedPaymentProviders
        .map((provider: any) => String(provider).toLowerCase())
        .filter((provider: string) => provider === 'emola' || provider === 'mkesh')
    : ['emola', 'mkesh'];
  const isPurchasable =
    actionEnabled &&
    actionType === 'purchase' &&
    Boolean(purchasePackageRef) &&
    Number.isFinite(purchaseAmount) &&
    purchaseAmount > 0;
  const rawType = safeText(item?.type, '');
  const typeCategory = LIFECYCLE_STATUSES.has(rawType.toLowerCase()) ? '' : rawType;

  return {
    id: safeText(item?.id, `campaign-${index + 1}`),
    title: safeText(item?.title ?? item?.name, `Campaign ${index + 1}`),
    summary: safeText(item?.summary ?? item?.description, ''),
    category: safeText(item?.customer_category ?? item?.campaign_category ?? item?.category ?? item?.segment ?? typeCategory, 'Campaign'),
    priority: safeText(item?.priority, 'normal'),
    status: normalizeStatus(item),
    expiry: safeText(item?.expiry ?? item?.expires_at ?? item?.end_date, ''),
    eligibility: safeText(item?.eligibility ?? item?.eligibility_label, 'Available to eligible subscribers.'),
    customer_eligible: normalizeEligibility(item),
    benefit: safeText(item?.benefit ?? item?.reward ?? item?.offer_value, ''),
    cta_label: safeText(item?.cta_label ?? customerAction.label, isPurchasable ? 'Buy Offer' : 'View Details'),
    action_type: actionType,
    action_payload: actionEnabled ? actionPayload : {},
    customer_action_enabled: actionEnabled && isPurchasable,
    is_purchasable: isPurchasable,
    purchase_package_ref: isPurchasable ? purchasePackageRef : undefined,
    purchase_amount: isPurchasable ? purchaseAmount : undefined,
    allowed_payment_providers: allowedProviders.length > 0 ? (allowedProviders as Array<'emola' | 'mkesh'>) : ['emola', 'mkesh'],
    saved: Boolean(item?.saved ?? false),
    last_action_status: (item?.last_action_status as CampaignLastActionStatus) ?? 'idle',
  };
};

export const normalizeCampaignFeed = (raw: any) => {
  const source = raw?.data ?? raw ?? {};
  const campaigns = Array.isArray(source.campaigns)
    ? source.campaigns
        .filter(isCustomerVisibleCampaign)
        .map((campaign: any, index: number) => normalizeCampaignItem(campaign, index))
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
      const bodyText = payload.sms_body || payload.message || payload.body;
      const smsBody = bodyText ? `?body=${encodeURIComponent(String(bodyText))}` : '';
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
