import { Alert, Linking, Platform } from 'react-native';
import { getApiErrorCode } from './apiErrors';

// Fallback actions keep the user inside a supported phone flow when a backend
// money-movement contract is not available in the current environment.
export const TMCEL_MENU_USSD = '*808#';

// Provider-backed cash actions are only live where the backend exposes the
// matching contract. For the current Tmcel rollout, mKesh stays on the phone
// action path so customers complete the transaction through the operator menu.
export const requiresTmcelPhoneAction = (provider?: string) =>
  provider === 'mkesh' || provider === 'millennium_izi';

export const isMissingMobileMoneyContract = (error: any) => {
  const status = error?.status ?? error?.originalStatus ?? error?.data?.status;
  const detail = String(
    error?.data?.detail ||
    error?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.error ||
    error?.message ||
    '',
  ).toLowerCase();
  const code = getApiErrorCode(error);
  const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : status;
  const bodyText = JSON.stringify(error?.data ?? error?.response?.data ?? error ?? {}).toLowerCase();

  // The live Tmcel host sometimes returns generic "failed" payloads instead of
  // explicit 404/405 contract errors, so we treat those as a supported phone
  // action handoff when the money-movement route is clearly unavailable.
  const looksLikeUnavailableMoneyRoute =
    detail.includes('not found') ||
    detail.includes('missing route') ||
    detail.includes('route unavailable') ||
    detail.includes('unsupported') ||
    detail.includes('no route') ||
    detail.includes('request failed') ||
    detail.includes('purchase failed') ||
    detail.includes('transfer failed') ||
    detail.includes('bill payment failed') ||
    bodyText.includes('not found') ||
    bodyText.includes('missing route') ||
    bodyText.includes('route unavailable') ||
    bodyText.includes('purchase failed') ||
    bodyText.includes('transfer failed') ||
    bodyText.includes('bill payment failed');

  return (
    normalizedStatus === 404 ||
    normalizedStatus === 405 ||
    normalizedStatus === 501 ||
    looksLikeUnavailableMoneyRoute
  );
};

export const openTmcelMenu = async () => {
  const encodedUssd = encodeURIComponent(TMCEL_MENU_USSD);
  const candidates = Platform.OS === 'android'
    ? [`tel:${encodedUssd}`, `tel:${TMCEL_MENU_USSD.replace('#', '%23')}`]
    : [`telprompt:${encodedUssd}`, `tel:${encodedUssd}`];

  for (const uri of candidates) {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) {
        await Linking.openURL(uri);
        return;
      }
    } catch {
      // Try the next URI variant before failing closed.
    }
  }

  throw new Error('This device cannot open the Tmcel menu.');
};

export const promptTmcelMenuFallback = (
  title: string,
  body: string,
  confirmLabel: string,
  onConfirm: () => Promise<void> | void,
) => {
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      onPress: async () => {
        try {
          await onConfirm();
        } catch (fallbackError: any) {
          Alert.alert('Error', fallbackError?.message || 'Unable to open the Tmcel menu.');
        }
      },
    },
  ]);
};
