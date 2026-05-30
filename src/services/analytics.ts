import { platformStorage } from './storage';
import { getExperimentAssignments } from './experiments';
import axios from 'axios';

export interface AnalyticsContext {
  screen?: string;
  placement?: string;
  source?: string;
}

export interface AnalyticsEvent {
  event_name: string;
  event_time: string;
  user_id: string;
  device_id: string;
  session_id: string;
  screen: string;
  context: Record<string, any>;
  properties: Record<string, any>;
  experiment_assignments: Record<string, string>;
}

const ANALYTICS_QUEUE_KEY = 'analytics_queue_v1';
const ANALYTICS_EXPORT_TS_KEY = 'analytics_last_export_ts';
const ANALYTICS_UPLOAD_TS_KEY = 'analytics_last_upload_ts';
const ANALYTICS_UPLOAD_ERR_KEY = 'analytics_last_upload_error';
const ANALYTICS_UPLOAD_SUCCESS_COUNT_KEY = 'analytics_upload_success_count';
const ANALYTICS_UPLOAD_FAILURE_COUNT_KEY = 'analytics_upload_failure_count';
const ANALYTICS_UPLOAD_ATTEMPT_COUNT_KEY = 'analytics_upload_attempt_count';
const ANALYTICS_QUEUE_DROP_COUNT_KEY = 'analytics_queue_drop_count';
const DEVICE_ID_KEY = 'analytics_device_id';
const QUEUE_LIMIT = 1000;
const BATCH_SIZE = 100;

let sessionId = `session-${Date.now().toString(36)}`;
let identity = 'anonymous';
let cachedDeviceId = '';
let trackedImpressions = new Set<string>();
let cachedAssignments: Record<string, string> = {};

const redactProperties = (properties: Record<string, any>) => {
  const redacted: Record<string, any> = {};
  const blockedKeys = ['pin', 'token', 'access_token', 'refresh_token', 'card_number', 'pan', 'cvv'];
  Object.keys(properties || {}).forEach((key) => {
    if (!blockedKeys.includes(key.toLowerCase())) {
      redacted[key] = properties[key];
    }
  });
  return redacted;
};

const safeParseQueue = async (): Promise<AnalyticsEvent[]> => {
  try {
    const raw = await platformStorage.getItemAsync(ANALYTICS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const persistQueue = async (queue: AnalyticsEvent[]) => {
  const trimmed = queue.slice(-QUEUE_LIMIT);
  if (queue.length > QUEUE_LIMIT) {
    const dropped = queue.length - QUEUE_LIMIT;
    const priorDropped = Number((await platformStorage.getItemAsync(ANALYTICS_QUEUE_DROP_COUNT_KEY)) || '0');
    await platformStorage.setItemAsync(ANALYTICS_QUEUE_DROP_COUNT_KEY, String(priorDropped + dropped));
  }
  await platformStorage.setItemAsync(ANALYTICS_QUEUE_KEY, JSON.stringify(trimmed));
};

const getDeviceId = async () => {
  if (cachedDeviceId) return cachedDeviceId;
  const existing = await platformStorage.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    cachedDeviceId = existing;
    return existing;
  }
  const generated = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  cachedDeviceId = generated;
  await platformStorage.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
};

const resolveAssignments = async () => {
  if (Object.keys(cachedAssignments).length > 0) return cachedAssignments;
  const seed = identity || (await getDeviceId());
  cachedAssignments = await getExperimentAssignments(seed);
  return cachedAssignments;
};

export const getAssignments = async () => resolveAssignments();

export const setAnalyticsIdentity = async (userId?: string | null) => {
  identity = userId && userId.trim().length > 0 ? userId : 'anonymous';
  cachedAssignments = {};
};

export const getAnalyticsIdentity = () => identity;

export const getSessionId = () => sessionId;

export const shouldTrackImpression = (itemId: string | number, placement: string) => {
  const key = `${sessionId}:${placement}:${itemId}`;
  if (trackedImpressions.has(key)) {
    return false;
  }
  trackedImpressions.add(key);
  return true;
};

export const track = async (
  eventName: string,
  properties: Record<string, any> = {},
  context: AnalyticsContext = {},
) => {
  const queue = await safeParseQueue();
  const assignments = await resolveAssignments();
  const event: AnalyticsEvent = {
    event_name: eventName,
    event_time: new Date().toISOString(),
    user_id: identity,
    device_id: await getDeviceId(),
    session_id: sessionId,
    screen: context.screen || 'unknown',
    context,
    properties: redactProperties(properties),
    experiment_assignments: assignments,
  };
  queue.push(event);
  await persistQueue(queue);
  if (queue.length % 20 === 0) {
    flushToBackend();
  }
  return event;
};

export const flushLocal = async () => {
  const queue = await safeParseQueue();
  await persistQueue(queue);
  return { queue_depth: queue.length };
};

const analyticsEndpoint = () => {
  const base = process.env.EXPO_PUBLIC_API_URL || '';
  return `${base}/api/v1/mobile/v1/analytics/events`;
};

export const flushToBackend = async () => {
  const queue = await safeParseQueue();
  const attemptCount = Number((await platformStorage.getItemAsync(ANALYTICS_UPLOAD_ATTEMPT_COUNT_KEY)) || '0');
  await platformStorage.setItemAsync(ANALYTICS_UPLOAD_ATTEMPT_COUNT_KEY, String(attemptCount + 1));
  if (queue.length === 0) {
    return { uploaded: 0, queue_depth: 0 };
  }

  let uploaded = 0;
  const remaining = [...queue];
  try {
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, BATCH_SIZE);
      const response = await axios.post(analyticsEndpoint(), { events: chunk });
      const accepted = Number(response?.data?.accepted || 0);
      const duplicates = Number(response?.data?.duplicates || 0);
      const consumed = Math.min(chunk.length, accepted + duplicates);
      if (consumed <= 0) {
        break;
      }
      uploaded += consumed;
      remaining.splice(0, consumed);
    }
    await persistQueue(remaining);
    await platformStorage.setItemAsync(ANALYTICS_UPLOAD_TS_KEY, new Date().toISOString());
    await platformStorage.deleteItemAsync(ANALYTICS_UPLOAD_ERR_KEY);
    const successCount = Number((await platformStorage.getItemAsync(ANALYTICS_UPLOAD_SUCCESS_COUNT_KEY)) || '0');
    await platformStorage.setItemAsync(ANALYTICS_UPLOAD_SUCCESS_COUNT_KEY, String(successCount + 1));
    return { uploaded, queue_depth: remaining.length };
  } catch (error: any) {
    const failureCount = Number((await platformStorage.getItemAsync(ANALYTICS_UPLOAD_FAILURE_COUNT_KEY)) || '0');
    await platformStorage.setItemAsync(ANALYTICS_UPLOAD_FAILURE_COUNT_KEY, String(failureCount + 1));
    await platformStorage.setItemAsync(
      ANALYTICS_UPLOAD_ERR_KEY,
      String(error?.response?.status || error?.message || 'upload_failed'),
    );
    return { uploaded, queue_depth: queue.length };
  }
};

export const exportEvents = async () => {
  const queue = await safeParseQueue();
  const payload = JSON.stringify(queue, null, 2);
  await platformStorage.setItemAsync(ANALYTICS_EXPORT_TS_KEY, new Date().toISOString());
  return payload;
};

export const getAnalyticsDiagnostics = async () => {
  const queue = await safeParseQueue();
  const counts: Record<string, number> = {};
  queue.forEach((event) => {
    counts[event.event_name] = (counts[event.event_name] || 0) + 1;
  });
  const top_event_counts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const impressions = counts.offer_impression || 0;
  const clicks = counts.offer_click || 0;
  const starts = counts.redeem_start || 0;
  const success = counts.redeem_success || 0;
  const failed = counts.redeem_fail || 0;

  const ratio = (num: number, den: number) => (den > 0 ? Number((num / den).toFixed(4)) : 0);

  return {
    queue_depth: queue.length,
    last_export_ts: await platformStorage.getItemAsync(ANALYTICS_EXPORT_TS_KEY),
    last_upload_ts: await platformStorage.getItemAsync(ANALYTICS_UPLOAD_TS_KEY),
    last_upload_error: await platformStorage.getItemAsync(ANALYTICS_UPLOAD_ERR_KEY),
    upload_attempt_count: Number((await platformStorage.getItemAsync(ANALYTICS_UPLOAD_ATTEMPT_COUNT_KEY)) || '0'),
    upload_success_count: Number((await platformStorage.getItemAsync(ANALYTICS_UPLOAD_SUCCESS_COUNT_KEY)) || '0'),
    upload_failure_count: Number((await platformStorage.getItemAsync(ANALYTICS_UPLOAD_FAILURE_COUNT_KEY)) || '0'),
    queue_drop_count: Number((await platformStorage.getItemAsync(ANALYTICS_QUEUE_DROP_COUNT_KEY)) || '0'),
    top_event_counts,
    assignments: await resolveAssignments(),
    funnel_metrics: {
      impressions,
      clicks,
      redeem_starts: starts,
      redeem_success: success,
      redeem_fail: failed,
      click_through_rate: ratio(clicks, impressions),
      redeem_start_rate: ratio(starts, clicks),
      redeem_completion_rate: ratio(success, starts),
      redeem_fail_rate: ratio(failed, starts),
    },
  };
};
