import { Alert, Linking, Platform } from 'react-native';

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
    error?.message ||
    '',
  ).toLowerCase();

  return status === 404 || status === 405 || status === 501 || /not found|unsupported|missing route|unavailable/.test(detail);
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
