# Phase 2 Trust Hardening Notes

## Scope
This phase improves trust and product depth without biometric integration.

## Implemented patterns
- Replaced alert-only placeholders with actionable in-app flows:
  - Home: Search and Notifications now open functional bottom-sheet modals.
  - Account: Billing, Security, and Notification Preferences now open functional detail modals.
- Hardened transaction semantics:
  - Marketplace validates redeemability before mutation calls.
  - Scan-to-Pay enforces strict QR payload schema before execution.
  - Wallet/P2P now distinguish unsupported backend capability (`404/405`) from transient failures.
- Standardized state/feedback utilities:
  - Shared status copy helper in `src/services/statusCopy.ts`.
  - Shared state view components in `src/components/StateViews.tsx`.

## QR payload contract
`ScanToPayModal` expects JSON payload:

```json
{
  "item_id": 123,
  "amount": 50,
  "merchant_ref": "ABC-123"
}
```

Malformed or incomplete payloads are rejected with explicit user guidance and no backend mutation.
