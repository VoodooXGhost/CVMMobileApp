# Tmcel Mobile App Production Architecture

## Customer Campaign and Offer Phone-Menu Handoff

- The app is a CVM client. Campaign and offer visibility, eligibility, lifecycle,
  and any allowed action come from the authenticated CVM feeds; the app never
  derives USSD codes from names, categories, or provider channels.
- A customer-safe action is rendered only when CVM supplies an active, visible,
  eligible item with `customer_action.enabled=true`, `customer_safe=true`,
  `type=ussd`, a label, and a valid `payload.ussd_code`.
- Home and Marketplace open the same details and confirmation flow. Cancel
  creates no CVM record. Continue first posts exactly one `campaign_id` or
  `offer_id` plus an idempotency key to
  `POST /api/v1/mobile/v1/campaign-action-attempts`.
- Only after CVM returns an attempt reference does the app call the Android
  `tel:` handler. It then best-effort PATCHes the attempt to
  `handoff_requested` or `handoff_failed` at
  `/api/v1/mobile/v1/campaign-action-attempts/{attempt_id}`.
- A successful OS handoff means only that Android accepted the dialer request.
  The app always treats purchase/activation outcome as unknown, does not show a
  purchase-success receipt, and does not add the attempt to financial activity.

## Release and Verification Requirements

- CVM must deploy Alembic revision `2026_11_mobile_campaign_action_attempts`
  and both mobile-facing routes before this client flow is enabled in UAT.
- Tmcel/CVM must configure an approved target on a specific active, visible,
  eligible campaign or offer. No campaign record is changed by the mobile
  release.
- Validation is local and simulated at the OS boundary. A live USSD session or
  charge must be separately authorized by Tmcel; neither is part of CI.
- Checks: `npm run ci:check` and `npx tsc --noEmit --pretty false`.
