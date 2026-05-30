import { platformStorage } from './storage';

const SESSION_START_COUNT_KEY = 'health_session_start_count';
const FATAL_JS_ERROR_COUNT_KEY = 'health_fatal_js_error_count';
const LAST_SESSION_START_TS_KEY = 'health_last_session_start_ts';

let initialized = false;

export const initHealthMonitoring = async () => {
  if (initialized) return;
  initialized = true;

  const starts = Number((await platformStorage.getItemAsync(SESSION_START_COUNT_KEY)) || '0');
  await platformStorage.setItemAsync(SESSION_START_COUNT_KEY, String(starts + 1));
  await platformStorage.setItemAsync(LAST_SESSION_START_TS_KEY, new Date().toISOString());

  const maybeErrorUtils = (global as any)?.ErrorUtils;
  if (maybeErrorUtils?.getGlobalHandler && maybeErrorUtils?.setGlobalHandler) {
    const original = maybeErrorUtils.getGlobalHandler();
    maybeErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
      if (isFatal) {
        const current = Number((await platformStorage.getItemAsync(FATAL_JS_ERROR_COUNT_KEY)) || '0');
        await platformStorage.setItemAsync(FATAL_JS_ERROR_COUNT_KEY, String(current + 1));
      }
      if (typeof original === 'function') {
        original(error, isFatal);
      }
    });
  }
};

export const getHealthSnapshot = async () => {
  const sessions = Number((await platformStorage.getItemAsync(SESSION_START_COUNT_KEY)) || '0');
  const fatalErrors = Number((await platformStorage.getItemAsync(FATAL_JS_ERROR_COUNT_KEY)) || '0');
  const crashFreeSessionRate = sessions > 0 ? Number(((sessions - fatalErrors) / sessions).toFixed(4)) : 1;
  return {
    session_start_count: sessions,
    fatal_js_error_count: fatalErrors,
    crash_free_session_rate: crashFreeSessionRate,
    last_session_start_ts: await platformStorage.getItemAsync(LAST_SESSION_START_TS_KEY),
  };
};
