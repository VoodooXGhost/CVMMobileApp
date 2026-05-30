# Phase 3 CVM Measurement and Experimentation

## Objective
Establish a mobile-first analytics and experimentation baseline for CVM funnel optimization without backend ingestion dependency.

## Event envelope
Each event is recorded with:
- `event_name`
- `event_time`
- `user_id`
- `device_id`
- `session_id`
- `screen`
- `context`
- `properties`
- `experiment_assignments`

## Funnel KPI formulas
- `click_through_rate = offer_click / offer_impression`
- `redeem_start_rate = redeem_start / offer_click`
- `redeem_completion_rate = redeem_success / redeem_start`
- `redeem_fail_rate = redeem_fail / redeem_start`

## Privacy policy
- Sensitive fields are redacted before persistence:
  - `pin`
  - `token`, `access_token`, `refresh_token`
  - `card_number`, `pan`, `cvv`

## Experiment assignments
- Deterministic local bucketing based on stable identity.
- Current experiments:
  - `home_hero_cta_variant`: `claim_now` / `unlock_offer`
  - `marketplace_card_cta_variant`: `hot_badge` / `deal_badge`

## Diagnostics
`Account > Analytics Diagnostics` provides:
- queue depth
- last export timestamp
- top event counts
- funnel metrics snapshot
- event JSON export via native share sheet
