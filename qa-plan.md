# QA Plan — PR #1618

Restrict signing & wallet identity to wallets linked to the authenticated Privy user.

## Changed Areas (runtime only)
- `utilities/auth/resolve-signing-wallets.ts` (new) — single source of truth for which connected wallet may sign
- `utilities/auth/select-primary-wallet.ts` — withholds identity (`undefined`) when no connected wallet is linked
- `hooks/useZeroDevSigner.ts` — hard-gate; embedded-mode users never prompt a foreign wallet (`EmbeddedWalletNotReadyError`)
- `components/Utilities/PrivyWagmiProviders.tsx` — pushes linked primary wallet back as Privy active wallet after reload
- `hooks/useProjectPermissions.ts` — `placeholderData: keepPreviousData` (scoped per project) to stop owner/admin flicker

> Browser-automation limitation: these accounts log in via **email + OTP → embedded wallet** (embedded signing mode). A genuinely *foreign/stale MetaMask* cannot be injected in headless Chromium, so the "foreign wallet excluded" invariant is covered by unit/trust suites. Browser tests target the **observable** consequences: stable identity, no flicker, clean cross-account isolation, reload persistence, and that signing never routes to a non-embedded prompt.

## Public Scenarios (no login)

| # | Scenario | Risk | Steps | Expected |
|---|----------|------|-------|----------|
| P1 | Homepage renders with auth providers, no console errors | Med | 1. Visit `/` logged out 2. Wait for hydration 3. Collect console/page errors | Hero "…funders fund and track…" + "One platform for two motions." visible; **no** uncaught errors from PrivyWagmiProviders / selectPrimaryWallet |
| P2 | Public project profile loads logged out (pre-auth wallets[0] path) | Med | 1. Visit a public project profile logged out 2. Wait for load | Page renders; no identity/owner controls; no crash from `selectPrimaryWallet(null, …)` |
| P3 | Reload public page repeatedly — no active-wallet reconcile loop | Low | 1. Visit `/` 2. Reload 3× | No infinite re-render, no sign-out loop, no error spam |

## Authenticated Scenarios (Privy test account login)

| # | Scenario | Risk | Steps | Expected |
|---|----------|------|-------|----------|
| A1 | Identity is the embedded wallet, never undefined/foreign | Critical | 1. Login `test-6959@privy.io` / `851695` 2. Open user menu / navbar 3. Read shown address | A real `0x…` identity (the embedded wallet); not blank, not "undefined", not a foreign address |
| A2 | Identity persists across reload (active-wallet reconcile) | Critical | 1. Login 2. Note identity 3. Hard-reload 4. Re-read identity | Still authenticated; **same** identity; no revert to a different wallet; no sign-out loop |
| A3 | Owner/admin controls don't flicker off on refetch (keepPreviousData) | Critical | 1. Login as a project-owner account 2. Open that project 3. Switch tabs / trigger a permissions refetch | Owner-only controls (edit/settings/manage) appear and **stay**; never flash to non-owner mid-refetch |
| A4 | Cross-account isolation — non-owner sees no owner controls | High | 1. Login `test-4927@privy.io` / `332664` 2. Open a project owned by a *different* account | No owner/admin controls; no leaked prior identity; flags resolve to non-owner cleanly |
| A5 | Logout then login as a different account switches identity cleanly | High | 1. Login acct A 2. Logout 3. Login acct B (`test-5740` / `829436`) | After logout identity cleared; after re-login identity = B's wallet; never shows A's stale address |
| A6 | Signing/attestation action routes to embedded wallet, no foreign prompt | Critical | 1. Login email account 2. Trigger an action that needs a signature (e.g. create/edit project or post update) 3. Observe signing | Uses embedded/gasless signer; **no** external-wallet (MetaMask) popup; no `EmbeddedWalletNotReadyError` on the happy path |

## Edge Cases
- linkedAccounts not yet hydrated immediately post-login → identity is `null`, never a foreign address (mid-login window).
- Rapid project switch A → B → A → owner flag from A must not bleed onto B (placeholderData scoped to same `projectId`/`chainID`).
- Reload while the project-permissions query is in-flight → no flash of non-owner controls.
- Account with multiple linked wallets → identity resolves to Privy's active (first linked) wallet, consistent between navbar and on-chain reads.
- Permissions API returns 500 → owner/admin default to **false** (safe), controls hidden, no crash.
- Logout mid-action (navigate away during a pending signature) → no orphaned signing prompt, no stuck spinner.
- Embedded wallet slow to hydrate on an unsupported-gasless chain → truthful retryable error, not a foreign-wallet fallback.
- Mobile viewport: identity/menu still render; reconcile effect doesn't loop.
