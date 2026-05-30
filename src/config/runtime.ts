export type RuntimeProfile = 'dev' | 'staging' | 'prod';

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

const allowedProfiles: RuntimeProfile[] = ['dev', 'staging', 'prod'];
const runtimeProfile = ((process.env.EXPO_PUBLIC_RUNTIME_PROFILE || 'dev').toLowerCase() as RuntimeProfile);
if (!allowedProfiles.includes(runtimeProfile)) {
  throw new Error(`Invalid EXPO_PUBLIC_RUNTIME_PROFILE '${process.env.EXPO_PUBLIC_RUNTIME_PROFILE}'. Use dev|staging|prod.`);
}

const requiredByProfile: Record<RuntimeProfile, string[]> = {
  dev: ['EXPO_PUBLIC_API_URL'],
  staging: ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_API_CONTRACT_VERSION', 'EXPO_PUBLIC_RELEASE_VERSION'],
  prod: ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_API_CONTRACT_VERSION', 'EXPO_PUBLIC_RELEASE_VERSION'],
};

export const validateRuntimeConfig = () => {
  const missing = requiredByProfile[runtimeProfile].filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required mobile env vars for ${runtimeProfile}: ${missing.join(', ')}`);
  }
};

export const runtimeConfig = {
  profile: runtimeProfile,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
  apiContractVersion: process.env.EXPO_PUBLIC_API_CONTRACT_VERSION || 'mobile-v1',
  releaseVersion: process.env.EXPO_PUBLIC_RELEASE_VERSION || 'local-dev',
  flags: {
    analyticsUploadEnabled: parseBoolean(process.env.EXPO_PUBLIC_ANALYTICS_UPLOAD_ENABLED, true),
    experimentsEnabled: parseBoolean(process.env.EXPO_PUBLIC_EXPERIMENTS_ENABLED, true),
    walletHighRiskActionsEnabled: parseBoolean(process.env.EXPO_PUBLIC_WALLET_HIGH_RISK_ACTIONS_ENABLED, true),
  },
};
