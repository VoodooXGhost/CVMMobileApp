# Phase 4 + 5 Implementation Notes (Mobile)

## Scope
- Added GitHub Actions workflows for fast checks and deeper scheduled checks.
- Added deterministic local check entrypoint: `npm run ci:check`.
- Upgraded analytics sink from local-export-only to dual-path upload with local fallback.

## Analytics Upload Behavior
- Primary upload endpoint: `/api/v1/mobile/v1/analytics/events`.
- Local queue remains the source of resilience when network or endpoint failures occur.
- Flush triggers:
  - on app foreground
  - on successful login
  - periodic interval (every 60 seconds)
  - best-effort threshold trigger during event tracking

## Diagnostics Enhancements
- Added upload operational fields:
  - `last_upload_ts`
  - `last_upload_error`
  - `upload_attempt_count`
  - `upload_success_count`
  - `upload_failure_count`
  - `queue_drop_count`

## Security + Observability Baseline
- Introduced `logger` wrapper (`src/services/logger.ts`) that emits logs only in dev mode.
- Replaced direct auth/API console logging with safe guarded logger usage.
- Existing analytics redaction policy remains enforced for sensitive keys (PIN/token/PAN/CVV).

## Known Local Check Constraint
- Full project `tsc --noEmit` is currently unstable in this environment due React Native/TypeScript toolchain conflicts.
- `ci:check` uses Expo config sanity as deterministic gate until TS toolchain alignment is completed in a dedicated follow-up.
