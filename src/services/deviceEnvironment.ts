import { Platform } from 'react-native';

/**
 * BlueStacks and other Android emulators do not represent a production payment
 * surface. We keep the real payment path for physical devices, but force a safe
 * phone-action fallback on virtual test devices so validation never submits a
 * live money-movement request.
 */
export const isEmulatorLikeAndroidDevice = () => {
  if (Platform.OS !== 'android') {
    return false;
  }

  const platformConstants = Platform.constants as any;
  const platformBits = [
    platformConstants?.Brand,
    platformConstants?.Manufacturer,
    platformConstants?.Model,
    platformConstants?.Fingerprint,
    platformConstants?.Serial,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /bluestacks|genymotion|emulator|sdk|virtual|vbox|qemu|android sdk built for x86/i.test(platformBits);
};
