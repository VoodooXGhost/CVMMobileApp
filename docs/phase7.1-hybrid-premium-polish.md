# Phase 7.1 Hybrid Premium Polish

## Intent
- Elevate visual quality to premium telecom-grade while keeping functional flows stable.
- Apply hybrid theming: dark premium zones + light utility zones.
- Enforce neutral white-label language for MTN/Tmcel deployments.
- Introduce PIN-first login shell for returning users with form fallback.

## Dark/Light Usage Matrix
- **Dark zones:** login shell, Home hero/primary sections, Wallet hero/actions, Marketplace/Rewards promotional surfaces, tab bar.
- **Light zones:** account settings forms, diagnostics, dense utility cards/modals requiring maximum readability.

## PIN-First Behavior
- Returning user path defaults to PIN keypad if `last_login_identity` exists.
- Fallback path allows switching to account+PIN form flow.
- On successful sign-in, identity is persisted for next PIN-first session.

## White-Label Copy Rules
- Avoid MTN-only wording in UI labels and screen titles.
- Use neutral product copy via branding config (`src/config/branding.ts`).
- Operator-specific labels/assets are runtime-driven through `EXPO_PUBLIC_OPERATOR`.

## Visual QA Checklist
- Login: premium PIN shell, deterministic fallback switch, readable keypad.
- Home/Wallet: dark premium depth with clear CTA contrast.
- Marketplace/Rewards: cohesive dark merchandising cards and category rails.
- Account: utility readability preserved; diagnostics remains legible.
- Tab bar: clear active-state legibility across dark and light backgrounds.
