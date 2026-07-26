import { Alert, Linking } from 'react-native';

// Fallback actions keep the user inside a supported phone flow when a backend
// money-movement contract is not available in the current environment.
export const TMCEL_MENU_USSD = '*808#';

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
  const uri = `tel:${encodeURIComponent(TMCEL_MENU_USSD)}`;
  const supported = await Linking.canOpenURL(uri);
  if (!supported) {
    throw new Error('This device cannot open the Tmcel menu.');
  }
  await Linking.openURL(uri);
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
