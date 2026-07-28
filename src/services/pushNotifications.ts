import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { platformStorage } from './storage';
import { logger } from './logger';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported' | 'unavailable';

export interface PushRegistrationState {
  pushToken: string | null;
  tokenType: 'expo' | null;
  notificationsPermission: NotificationPermissionState;
}

const PUSH_PERMISSION_KEY = 'notifications_permission_state';
const PUSH_TOKEN_KEY = 'notifications_push_token';
const ANDROID_CHANNEL_ID = 'tmcel-updates';

const getExpoProjectId = () => {
  const envProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const easProjectId = (Constants as any)?.easConfig?.projectId;
  const extraProjectId = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
  if (typeof envProjectId === 'string' && envProjectId.trim().length > 0) return envProjectId;
  if (typeof easProjectId === 'string') return easProjectId;
  return typeof extraProjectId === 'string' ? extraProjectId : null;
};

const resolvePermissionStatus = (permission: unknown): NotificationPermissionState => {
  const status = (permission as any)?.status;
  if (status === 'granted' || status === 'denied' || status === 'undetermined') {
    return status;
  }
  if ((permission as any)?.granted === true) return 'granted';
  return 'undetermined';
};

const persistPushState = async (state: PushRegistrationState) => {
  await platformStorage.setItemAsync(PUSH_PERMISSION_KEY, state.notificationsPermission);
  if (state.pushToken) {
    await platformStorage.setItemAsync(PUSH_TOKEN_KEY, state.pushToken);
  }
};

export const configureNotificationPresentation = () => {
  // Show Tmcel push alerts even when the app is foregrounded; the inbox remains the durable source of truth.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const configureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Tmcel updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ffcc00',
    sound: 'default',
  });
};

export const requestPushRegistrationState = async (): Promise<PushRegistrationState> => {
  if (Platform.OS === 'web') {
    const state = { pushToken: null, tokenType: null, notificationsPermission: 'unsupported' as const };
    await persistPushState(state);
    return state;
  }

  if (!Device.isDevice) {
    const state = { pushToken: null, tokenType: null, notificationsPermission: 'unsupported' as const };
    await persistPushState(state);
    logger.log('Push token unavailable on emulator/device profile');
    return state;
  }

  await configureAndroidNotificationChannel();

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = resolvePermissionStatus(currentPermission);

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = resolvePermissionStatus(requestedPermission);
  }

  if (finalStatus !== 'granted') {
    const state = { pushToken: null, tokenType: null, notificationsPermission: 'denied' as const };
    await persistPushState(state);
    logger.warn('Push notification permission was not granted', { status: finalStatus });
    return state;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    const state = { pushToken: null, tokenType: null, notificationsPermission: 'unavailable' as const };
    await persistPushState(state);
    logger.warn('Expo project id is missing; push token cannot be requested in this build.');
    return state;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const state = {
      pushToken: token.data,
      tokenType: 'expo' as const,
      notificationsPermission: 'granted' as const,
    };
    await persistPushState(state);
    return state;
  } catch (error) {
    const state = { pushToken: null, tokenType: null, notificationsPermission: 'unavailable' as const };
    await persistPushState(state);
    logger.warn('Expo push token request failed', error);
    return state;
  }
};

export const addNotificationResponseListener = (onOpenInbox: () => void) => {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const deepLink = response.notification.request.content.data?.deep_link;
    logger.log('Push notification opened', { deepLink });
    onOpenInbox();
  });
};
