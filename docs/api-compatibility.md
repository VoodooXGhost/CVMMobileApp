# Mobile API Compatibility Strategy

## Purpose
This document explains how the mobile client keeps a stable user experience while supporting multiple backend contract variants during rollout.

## Supported endpoint variants
- **Primary contract**: `/api/v1/mobile/...`
- **Fallback contract**: `/api/...`

The API layer attempts primary paths first, then falls back only when the response indicates an endpoint mismatch (`404` or `405`).

## Response normalization
To protect screen components from backend shape drift, `apiSlice` normalizes responses into stable client models:

- `home` model: `profile`, `loyalty`, `gamification`, `hero_banners`, `offers`, `categories`
- `wallet` model: `balance`, `totalBalance`, `cards`, `transactions`
- `offers` model: `offers`, `categories`
- `usage` model: `usage_history`, `linked_lines`

Normalization rules include:
- Safe array fallbacks for missing collections
- Numeric parsing for currency/amount fields
- Compatibility mapping for legacy names (`trending` -> `offers`, `yelloBucks` -> `loyalty`)
- Defensive defaults so views render instead of crashing

## Authentication compatibility
The auth context attempts login in deterministic order:
1. `POST /api/v1/mobile/auth/login` with `msisdn/pin`
2. `POST /auth/login` with `username/password`

This allows rollout continuity while backend environments converge on one contract.

## Contributor guidance
- Keep compatibility logic centralized in `src/services/apiSlice.ts` and `src/services/auth.context.tsx`.
- Do not add endpoint-shape branching in screens.
- If a new backend variant is introduced, update the adapter layer and this document in the same change.
