# Tmcel Super App: Verification & Testing Checklist (Phase 6)

This document outlines the critical scenarios that must be verified to ensure the "Digital Pulse" design system and Phase 6 Mobile Auth architecture are functioning correctly.

## 🟢 1. Authentication & Security (Phase 6)
- [ ] **MSISDN Login**: Enter `+27821234567` and PIN `@dmin!10`. Verify successful navigation to Home.
- [ ] **Invalid Credentials**: Enter a wrong PIN. Verify "Login Failed" alert appears.
- [ ] **Secure Storage**: Close the app and reopen. Verify you are still logged in (Token persistence via `Expo SecureStore`).
- [ ] **CORS Verification**: Confirm no "Network Error" appears since the BFF origins were expanded to include port 8081.

## 🟢 2. "The Digital Pulse" Branding & Stability
- [ ] **No Reference Errors**: Navigate through all tabs (Home, Wallet, Shop, Rewards, My Account). Confirm NO "ReferenceError: Platform is not defined" errors appear in the console.
- [ ] **Shadow Implementation**: Open the console. Verify NO "shadow prop deprecated" warnings appear (should use `boxShadow` on web).
- [ ] **Typography**: Verify headers use **Work Sans** (Bold) and body text uses **Plus Jakarta Sans**.
- [ ] **Ghost Borders**: On the Login screen, click into the MSISDN field. Confirm the input has NO border until it is focused.

## 🟢 3. "My Account" Editorial Screen (Rebuild)
- [ ] **High-Contrast "Black Block"**: Verify the stats card has the new black background with white text and dual-column layout.
- [ ] **Persona Stats**: Verify stats like "Customer Since: Jan 2018" and "Data Usage: 12.4 GB" are visible.
- [ ] **Profile Avatar**: Verify the avatar displays initials (e.g., "TM" for Thabo Mokoena) and has the black user badge.
- [ ] **Sign Out**: Click "Sign Out" at the bottom. Verify you are returned to the Login screen and tokens are cleared.

## 🟢 4. Connectivity & API Binding
- [ ] **BFF Integration**: Observe the Home screen "Balance" cards. Verify they update with data from the BFF (No hardcoded placeholders).
- [ ] **Tab Bar Padding**: (Web Only) Verify the `GlassTabBar` correctly calculates bottom padding to avoid overlapping with browser controls.

---
**Verified By:** ____________________
**Date:** __________________________
