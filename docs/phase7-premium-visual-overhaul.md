# Phase 7 Premium Visual Overhaul (Stitch-First)

## Objective
- Upgrade the mobile UI from prototype feel to a premium editorial telecom experience aligned to `stitch/mtn_pulse_digital/DESIGN.md`.

## What Was Implemented
- Yellow-led interaction system with brown removed from primary CTA usage.
- Expanded design tokens with semantic roles (`cta_*`, `focus_ghost`, `surface_nested_*`, `status_*`) and ambient elevation presets.
- Typography enforcement for Work Sans (display/headline) and Plus Jakarta Sans (title/body/label).
- Shared primitives introduced:
  - `AppButton`
  - `AppCard`
  - `AppInput`
- Bottom navigation refined for improved glassmorphism, legibility, and premium active states.
- Visual upgrades applied across login and all primary tab screens to improve hierarchy and trust cues.

## Stitch Rule Mapping
- **No-line separation:** replaced key bordered blocks with tonal layering + ambient elevation.
- **Surface hierarchy:** consistent use of `surface`, `surface_container_low`, and `surface_container_lowest`.
- **Ghost focus:** input focus now uses low-opacity ghost border styling.
- **Editorial hierarchy:** stronger spacing rhythm and typographic contrast.

## Do / Don’t
- **Do** use tonal layering and white space for section separation.
- **Do** keep primary CTAs yellow with dark text for clarity and brand energy.
- **Do** keep high-trust card sections calm and consistent.
- **Don’t** reintroduce muddy brown as primary action color.
- **Don’t** add hard 1px dividers unless required for accessibility edge cases.
- **Don’t** mix ad-hoc font sizes when a token exists.

## Visual QA Checklist
- Login: premium hierarchy, clean inputs, no placeholder-style visuals.
- Home: elevated hero + clear quick actions + readable balances.
- Wallet: trust-forward card/list hierarchy and polished action controls.
- Marketplace/Rewards: consistent cards, badges, and CTA prominence.
- My MTN: consistent premium surfaces including diagnostics modal.
- Tab bar: remains legible over all screen backgrounds.
