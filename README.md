# Tmcel CVM Mobile App

Production-oriented React Native (Expo) mobile channel for Tmcel Customer Value Management (CVM).

This app delivers core CVM journeys: authentication, personalized offers, rewards redemption, wallet interactions, and account controls, with analytics instrumentation and rollout safety controls.

## 1) Product Purpose

- Provide a reliable mobile engagement channel for CVM outcomes (retention, upsell, loyalty, redemption conversion).
- Expose personalized experiences across Home, Marketplace, Rewards, Wallet, and Account.
- Capture measurable funnel behavior to support experimentation and KPI-driven optimization.

## 2) Current Phase Status

Completed:
- **Phase 1**: API compatibility + payload normalization + auth/session hardening.
- **Phase 2**: Trust and product-depth improvements in core user flows.
- **Phase 3**: Mobile analytics foundation + deterministic local experiments.
- **Phase 4/5**: Enterprise readiness controls + backend analytics sink integration.
- **Phase 6**: Production rollout hardening (runtime profiles, release gates, kill switches, SLO diagnostics).

Outstanding hardening backlog (next phase):
- Full strict TypeScript gate recovery for entire mobile codebase.
- Real biometric integration (currently mock hook).
- Additional cross-repo contract test expansion with backend validator.

## 3) Tech Stack

- **Runtime**: Expo + React Native
- **Navigation**: React Navigation (bottom tabs + stack)
- **State/Data**: Redux Toolkit + RTK Query
- **HTTP**: Axios
- **Storage**: `expo-secure-store` (native) + local storage fallback for web
- **UI**: Tokenized theme system under `src/theme`

## 4) Runtime Profiles and Environment

Runtime profiles are enforced at startup via `src/config/runtime.ts`.

Supported profiles:
- `dev`
- `staging`
- `prod`

### Required environment variables

For `dev`:
- `EXPO_PUBLIC_API_URL`

For `staging` / `prod`:
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_API_CONTRACT_VERSION`
- `EXPO_PUBLIC_RELEASE_VERSION`
- `EXPO_PUBLIC_EAS_PROJECT_ID` (required for real Expo push tokens)

Production builds must use a Tmcel-approved HTTPS DNS endpoint. Raw IP endpoints, localhost, laptop IPs, and emulator hosts are rejected in the `prod` runtime profile.

### Feature flags / kill switches

- `EXPO_PUBLIC_ANALYTICS_UPLOAD_ENABLED`
- `EXPO_PUBLIC_EXPERIMENTS_ENABLED`
- `EXPO_PUBLIC_WALLET_HIGH_RISK_ACTIONS_ENABLED`

These are used for staged rollout control and emergency rollback without code changes.

## 5) Installation and Run

```bash
npm install
npm run start
```

Useful targets:

```bash
npm run android
npm run ios
npm run web
```

## 6) Quality Gates and CI

Local check entrypoint:

```bash
npm run ci:check
```

Current `ci:check` includes:
- Expo config sanity
- analytics/metrics contract check

Additional scripts:

```bash
npm run contract:check
npm run manifest:generate
```

GitHub Actions workflows:
- `.github/workflows/ci.yml` (fast checks + release manifest artifact)
- `.github/workflows/deep-checks.yml` (deeper/manual checks + manifest)

## 7) Analytics and Experimentation

Analytics service (`src/services/analytics.ts`) provides:
- local queueing with bounded size and drop accounting
- retry-safe backend flush with local fallback
- diagnostic metrics for rollout visibility

Event envelope includes:
- `event_name`, `event_time`, `user_id`, `device_id`, `session_id`
- `screen`, `context`, `properties`, `experiment_assignments`

Experiment service (`src/services/experiments.ts`) provides deterministic local assignment with feature-flag control.

## 8) Operational Diagnostics (Account Screen)

Diagnostics currently expose:
- queue depth and drop count
- upload attempts/success/failure
- retry streak and sync age
- queue pressure level
- kill switch state
- crash-free session rate (health snapshot)
- funnel rates (CTR/redeem rates)

## 9) Security Notes

- Sensitive analytics keys are redacted before persistence/upload (PIN/token/PAN/CVV class fields).
- Logging is dev-guarded through `src/services/logger.ts`.
- Runtime validation fails fast for missing required environment settings by profile.

## 10) Project Structure (Key Areas)

- `App.js` — app bootstrap + auth shell + runtime validation
- `src/config/` — runtime profile/flag config
- `src/services/` — auth, API, analytics, experiments, storage, health
- `src/screens/` — main CVM UI journeys
- `src/components/` — reusable interaction components/modals
- `docs/` — mobile phase implementation notes
- `scripts/` — contract checks and release manifest generation

## 11) Key Documentation

Mobile-local:
- `docs/phase2-trust-hardening.md`
- `docs/phase3-cvm-measurement.md`
- `docs/phase4-5-enterprise-readiness.md`
- `docs/phase6-rollout-hardening.md`

Workspace-level:
- `../docs/production-architecture.md`
- `../docs/phase6-production-rollout-runbook.md`

## 12) Contribution Guidelines

- Keep changes focused by phase/scope.
- Do not reintroduce hardcoded demo placeholders into live transactional paths.
- Preserve payload normalization boundaries (avoid per-screen backend contract branching).
- Keep security-sensitive logs out of production paths.
- Run `npm run ci:check` before committing.

## 13) License / Ownership

Internal enterprise project for Tmcel CVM delivery. Treat implementation and data contracts as controlled organizational assets.
