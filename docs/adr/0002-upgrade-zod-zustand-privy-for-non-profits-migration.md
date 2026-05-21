# Upgrade Zod, Zustand, and Privy as a prerequisite to the `/non-profits/` migration

## Status

accepted

## Context

The `/non-profits/` feature was ported from grant-atlas, which runs on Zod v4, Zustand v5, and Privy 3.21. gap-app-v2 was on Zod v3, Zustand v4, and Privy 3.7 (package.json pinned `^3.7.0`). Two paths existed: downgrade the grant-atlas code to gap-app-v2's versions, or upgrade gap-app-v2.

## Decision

Upgrade gap-app-v2 to Zod v4, Zustand v5, and Privy 3.27 as **Phase 0** of the migration, shipped in a single PR with three separate commits before any `/non-profits/` product work begins.

> **Note on Privy version:** The original scope targeted Privy 3.21. The PR resolved to **3.27** (latest `^3.21` semver range) because `@privy-io/wagmi` had advanced to v4, and `@privy-io/wagmi@4` requires `@privy-io/react-auth@^3` — pulling the latest 3.x patch ensures peer-dep alignment and avoids installing two major Privy releases side by side. No breaking changes were introduced between 3.21 and 3.27 relevant to this codebase.

## Rationale

- Downgrading grant-atlas code creates ongoing drift: every future port or shared utility would need to be back-fitted. Upgrading once aligns the ecosystem.
- Zod v4 and Zustand v5 are the actively maintained lines; staying behind delays a forced upgrade later.
- Privy 3.7 → 3.27 closes a gap that already shows up in unrelated friction (smart-wallet hooks, provider config drift). Landed at 3.27 rather than the scoped 3.21 for peer-dep alignment with `@privy-io/wagmi@4`.
- Phasing the upgrades **before** the migration isolates blast radius: any auth or schema regression is attributable to the upgrade PR, not to new product code.

## Consequences

- High blast radius. Zod's `.errors → .issues` rename and `z.record()` signature change touch every existing schema. Zustand v5 removes the default export and changes `createStore`/`useStore` patterns. Privy 3.27 may break wallet/smart-account flows.
- Phase 0 must be scheduled in a quiet release window with full Playwright smoke coverage on auth-protected routes.
- Once Phase 0 ships, the rest of the migration can adopt grant-atlas code with minimal version-related rewrites.

## Considered alternatives

- **Downgrade grant-atlas code to gap-app-v2 versions** — rejected. Creates ongoing maintenance debt and signals that gap-app-v2 is the slower-moving codebase, which discourages future ports.
- **Selective upgrades (only what /non-profits needs)** — rejected. Half-upgraded state is harder to reason about than either old or new across the board.
