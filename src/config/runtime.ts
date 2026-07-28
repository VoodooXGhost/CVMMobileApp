export type RuntimeProfile = 'dev' | 'staging' | 'prod' | 'validation';

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const allowedProfiles: RuntimeProfile[] = ['dev', 'staging', 'prod', 'validation'];
const runtimeProfile = ((process.env.EXPO_PUBLIC_RUNTIME_PROFILE || 'dev').toLowerCase() as RuntimeProfile);
if (!allowedProfiles.includes(runtimeProfile)) {
  throw new Error(
    `Invalid EXPO_PUBLIC_RUNTIME_PROFILE '${process.env.EXPO_PUBLIC_RUNTIME_PROFILE}'. Use dev|staging|prod|validation.`,
  );
}

const defaultDevApiUrl = 'http://10.0.2.2:8125';
const isRawIpEndpoint = (value: string) => /^https?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/|$)/.test(value);

export const validateRuntimeConfig = () => {
  // Keep dev/test builds launchable on BlueStacks even if the env file was not injected,
  // but preserve strict validation for staging, validation, and prod profiles.
  const hasConfiguredApiUrl =
    typeof runtimeConfig.apiUrl === 'string' &&
    runtimeConfig.apiUrl.trim().length > 0 &&
    runtimeConfig.apiUrl !== defaultDevApiUrl;

  if (runtimeProfile !== 'dev' && !hasConfiguredApiUrl) {
    throw new Error(`Missing required mobile API URL for ${runtimeProfile}.`);
  }

  if (runtimeProfile === 'prod') {
    if (!runtimeConfig.apiUrl.startsWith('https://')) {
      throw new Error('Production mobile API URL must use HTTPS.');
    }
    if (isRawIpEndpoint(runtimeConfig.apiUrl)) {
      throw new Error('Production mobile API URL must use Tmcel-approved DNS, not a raw IP address.');
    }
    if (['localhost', '127.0.0.1', '10.0.2.2'].some((host) => runtimeConfig.apiUrl.includes(host))) {
      throw new Error('Production mobile API URL cannot point to local emulator hosts.');
    }
  }

  if (runtimeProfile === 'validation') {
    if (['localhost', '127.0.0.1', '10.0.2.2'].some((host) => runtimeConfig.apiUrl.includes(host))) {
      throw new Error('Validation mobile API URL must be resolvable from BlueStacks.');
    }
  }
};

export const runtimeConfig = {
  profile: runtimeProfile,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || defaultDevApiUrl,
  apiContractVersion: process.env.EXPO_PUBLIC_API_CONTRACT_VERSION || 'mobile-v1',
  releaseVersion: process.env.EXPO_PUBLIC_RELEASE_VERSION || 'local-dev',
  flags: {
    analyticsUploadEnabled: parseBoolean(process.env.EXPO_PUBLIC_ANALYTICS_UPLOAD_ENABLED, true),
    experimentsEnabled: parseBoolean(process.env.EXPO_PUBLIC_EXPERIMENTS_ENABLED, true),
    walletHighRiskActionsEnabled: parseBoolean(process.env.EXPO_PUBLIC_WALLET_HIGH_RISK_ACTIONS_ENABLED, true),
  },
};

/**
 * Validation and non-production builds need to tag requests for zero-rating
 * observability so EngageHub can surface billing headers during smoke tests.
 */
export const shouldAttachZeroRateHeader = () => runtimeConfig.profile !== 'prod';

export const getZeroRateRequestHeaders = () =>
  shouldAttachZeroRateHeader() ? { 'X-Tmcel-Zero-Rate': 'true' } : {};
