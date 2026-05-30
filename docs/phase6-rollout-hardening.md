# Phase 6 Rollout Hardening Notes (Mobile)

## Runtime profile and release gating
- Runtime profiles: `dev`, `staging`, `prod`.
- Startup env validation now enforces required vars for profile.
- CI check now includes analytics contract check and release manifest generation.

## Kill switches
- `EXPO_PUBLIC_ANALYTICS_UPLOAD_ENABLED`
- `EXPO_PUBLIC_EXPERIMENTS_ENABLED`
- `EXPO_PUBLIC_WALLET_HIGH_RISK_ACTIONS_ENABLED`

## Analytics/SLO diagnostics fields
- `retry_streak`
- `sync_age_seconds`
- `queue_pressure`
- `kill_switch_state`
- `health.crash_free_session_rate`

## Rollback behavior
- If analytics upload flag is off, client automatically remains in local queue mode.
- Experiments can be disabled without changing UI routes.
- Wallet high-risk actions (scan/transfer/freeze) can be disabled during incidents.
