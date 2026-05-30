const requiredDiagnosticsKeys = [
  'queue_depth',
  'last_upload_ts',
  'last_upload_error',
  'upload_attempt_count',
  'upload_success_count',
  'upload_failure_count',
  'retry_streak',
  'sync_age_seconds',
  'queue_pressure',
  'kill_switch_state',
];

const requiredMetricsKeys = [
  'analytics.ingest.accepted_total',
  'analytics.ingest.rejected_total',
  'analytics.ingest.duplicate_total',
  'requests.p95_latency_ms',
];

const contract = {
  diagnostics: requiredDiagnosticsKeys,
  backend_metrics: requiredMetricsKeys,
  api_contract_version: process.env.EXPO_PUBLIC_API_CONTRACT_VERSION || 'mobile-v1',
};

if (!contract.api_contract_version) {
  throw new Error('Missing EXPO_PUBLIC_API_CONTRACT_VERSION.');
}

console.log(JSON.stringify(contract, null, 2));
