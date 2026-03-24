# Karma Frontend Master Test Plan: 100/100 Trust

**Date**: 2026-03-24 | **Compiled from**: 4 Senior QA Engineers + 3-round industry debate + deep codebase analysis

---

## Test Stack

| Layer | Tool | Replaces |
|-------|------|----------|
| **Unit + Integration** | **Vitest** | Jest (migrated in Phase 1) |
| **E2E + Smoke + Anvil** | **Playwright** | Cypress (deleted in Phase 3) |

**Why Vitest over Jest:**
- Industry standard: Uniswap, ENS, SushiSwap all use Vitest
- Native ESM support — eliminates the 30+ `transformIgnorePatterns` entries for wagmi, viem, msw, etc.
- Native TypeScript — no `ts-jest` or `next/jest` wrapper needed
- Vite-based — faster startup, HMR-like watch mode
- Compatible API — `vi.fn()` ≈ `jest.fn()`, `vi.mock()` ≈ `jest.mock()`, minimal code changes
- Eliminates: `jest-resolver.js`, `next/jest` wrapper, `moduleNameMapper` mock redirects, `transformIgnorePatterns`

---

## Overview

| Boundary | QA Engineer | Tests Planned | Key Files |
|----------|------------|---------------|-----------|
| Wallet Transactions | QA #1 | 215 | use-claim-transaction, use-delegated-claim, useZeroDevSigner, safe.ts |
| Privy Auth | QA #2 | 183 | useAuth, privy-bridge-context, PrivyProviderWrapper, token-manager |
| Backend Requests | QA #3 | ~200 | fetchData, 10 services, React Query hooks, contract schemas |
| Integration & Industry | QA #4 | ~30 cross-boundary + infrastructure | Factories, MSW, render utils, CI, Anvil |
| **TOTAL** | | **~628 meaningful tests** | |

**Bugs found during planning:** 3 real bugs in production code
1. `error.includes()` crash on network errors in `program-reviewers.service.ts:77`
2. 429 responses retried by React Query default (`retry: 1`) — should NOT retry rate limits
3. No 401 token refresh flow — expired token means all requests silently fail

---

## Shared Infrastructure (Build First)

### Factories (`__tests__/factories/`)
- `auth.factory.ts` — createAuth(), createAuthForRole(role), role presets (guest/applicant/reviewer/communityAdmin/superAdmin)
- `application.factory.ts` — with status variants (DRAFT/SUBMITTED/APPROVED/REJECTED)
- `project.factory.ts`, `community.factory.ts`, `program.factory.ts`, `payout.factory.ts`, `claim.factory.ts`, `milestone.factory.ts`
- Pattern: sensible defaults + deep partial overrides via `mergeDeep()`

### MSW Handler Library (`__tests__/msw/handlers/`)
- Per-domain files: auth, applications, communities, programs, projects, payouts, claims, comments
- Each exports a function returning handlers (composable, not bare arrays)
- Default handlers (happy path) + error scenario handlers (opt-in per test)
- Validated against Zod contract schemas

### Render Utilities (`__tests__/utils/`)
- `renderWithProviders()` — QueryClient + auth context + wallet context (NO global vi.mock)
- `renderHookWithProviders()` — for hook tests
- Auth/wallet injected through provider tree, not module mocking
- `rpc-failure.ts` — shared failing transport for RPC error testing

### Playwright Fixtures (`e2e/fixtures/`)
- `wallet.fixture.ts` — mock EIP-1193 provider injection
- `anvil.fixture.ts` — Anvil fork with pinned blocks, snapshot/revert per test
- `rpc.fixture.ts` — network-level RPC failure injection
- Extends existing `auth.ts`, `api-mocks.ts`, `whitelabel.ts`

### Contract Schemas (`__tests__/contracts/schemas/`)
- Zod schemas mirroring backend response shapes
- Factory validation: every factory output must satisfy its schema
- Nightly live validation against staging API

---

## Phase 1: Foundation (Week 1-2)

### Week 1: Vitest Migration + Infrastructure + Pure Logic

**Step 0: Jest → Vitest Migration (Day 1-2)**

This is the FIRST thing to do. Everything else builds on Vitest.

| Task | What Changes |
|------|-------------|
| Install Vitest + deps | `pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom` |
| Create `vitest.config.ts` | Replace `jest.config.ts` — see config below |
| Remove Jest deps | Remove `jest`, `jest-environment-jsdom`, `@types/jest`, `ts-jest`, `next/jest`, `jest-resolver.js` |
| Update test scripts | `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"` |
| Global search-replace | `jest.fn()` → `vi.fn()`, `jest.mock()` → `vi.mock()`, `jest.spyOn()` → `vi.spyOn()`, `jest.clearAllMocks()` → `vi.clearAllMocks()`, `jest.useFakeTimers()` → `vi.useFakeTimers()` |
| Remove `transformIgnorePatterns` | Vitest handles ESM natively — the 30+ package list is gone |
| Remove `moduleNameMapper` mock redirects | Replace with proper `vi.mock()` per-test or Vitest `alias` config |
| Remove `jest-resolver.js` | Not needed with Vitest |
| Remove `next/jest` wrapper | Not needed — Vitest resolves Next.js paths via `alias` |
| Update `setup.ts` | Replace `jest.*` globals with `vi.*` equivalents |
| Remove Cypress test scripts | `e2e`, `e2e:headless`, `e2e:ci`, `component`, `component:headless` |

**Vitest Config:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,          // describe, it, expect available globally
    setupFiles: ['./__tests__/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 70,
        statements: 70,
      },
    },
    // No transformIgnorePatterns needed — Vitest handles ESM natively
    // No moduleNameMapper needed — tsconfigPaths handles aliases
    // No custom resolver needed — Vitest resolves pnpm structure
  },
});
```

**Key migration notes:**
- Vitest's `vi.mock()` is hoisted automatically (same as Jest), so import order doesn't matter
- `@testing-library/jest-dom` works with Vitest via `@testing-library/jest-dom/vitest`
- MSW works identically with Vitest — no changes to handlers or server setup
- Playwright tests are NOT affected — they're a separate config

| # | Task | Tests | Effort |
|---|------|-------|--------|
| 0 | **Jest → Vitest migration** | — | **2 days** |
| 1 | Create all factory files | — | 1 day |
| 2 | Create MSW handler library (all domains) | — | 1.5 days |
| 3 | Create render utilities (renderWithProviders) | — | 0.5 day |
| 4 | Create `__tests__/setup.ts` (replace global setup.js) | — | 0.5 day |
| 5 | `sanitizeErrorMessage()` tests | 24 | 0.5 day |
| 6 | `uuidToBytes16()` + `buildClaimTypedData()` tests | 20 | 0.5 day |
| 7 | `switchOrAddChain()` + `getChainByName()` tests | 14 | 0.5 day |
| 8 | `fetchData` utility tests (all HTTP statuses) | 30 | 1 day |
| 9 | `compare-all-wallets` tests | 14 | 0.5 day |
| 10 | `cypress-auth.ts` tests | 10 | 0.25 day |
| 11 | Contract schemas + factory validation tests | 15 | 0.5 day |

**Week 1 Total: ~127 tests, 7 days effort**

### Week 2: Core Hooks + Services
| # | Task | Tests | Effort |
|---|------|-------|--------|
| 12 | `useAuth.ts` — all 5 effects, all edge cases | 45 | 2 days |
| 13 | `token-manager.ts` additions | 7 | 0.5 day |
| 14 | `privy-bridge-context.tsx` tests | 12 | 0.5 day |
| 15 | `permission-context.tsx` additions | 27 | 1 day |
| 16 | `payout-disbursement.service` tests | 25 | 1 day |
| 17 | `permissions.service` tests | 15 | 0.5 day |
| 18 | `api-key.service` tests | 8 | 0.25 day |

**Week 2 Total: ~139 tests, 5.75 days effort**

---

## Phase 2: Transaction Trust (Week 3-4)

### Week 3: Wallet Transaction Hooks
| # | Task | Tests | Effort |
|---|------|-------|--------|
| 19 | `useClaimTransaction` mutationFn tests | 19 | 1 day |
| 20 | `useDelegatedClaim` full test suite (ZERO coverage today) | 38 | 2 days |
| 21 | `useZeroDevSigner` getAttestationSigner tests | 16 | 1 day |
| 22 | RPC failure mode tests (20 scenarios) | 20 | 1 day |

**Week 3 Total: ~93 tests, 5 days effort**

### Week 4: Safe + Remaining Services + Integration
| # | Task | Tests | Effort |
|---|------|-------|--------|
| 23 | `safe.ts` full test suite (ZERO coverage today) | 52 | 2.5 days |
| 24 | Remaining 7 services (projects, comments, reviewers, eligibility, etc.) | 60 | 2 days |
| 25 | Auth integration tests (login flow, cross-tab, wallet switch) | 15 | 1 day |

**Week 4 Total: ~127 tests, 5.5 days effort**

---

## Phase 3: E2E + Cross-Boundary (Week 5-6)

### Week 5: Playwright E2E + Cypress Removal
| # | Task | Tests | Effort |
|---|------|-------|--------|
| 26 | Delete Cypress entirely | — | 0.5 day |
| 27 | Port 5-8 valuable Cypress specs to Playwright | 8 | 1 day |
| 28 | Rewrite existing 16 Playwright tests with real assertions | 16 | 1.5 days |
| 29 | New E2E: auth role-based access | 6 | 0.5 day |
| 30 | New E2E: claim funds UI flow | 6 | 0.5 day |
| 31 | New E2E: error page rendering (500, 403, 429) | 6 | 0.5 day |
| 32 | Cross-boundary integration tests (auth+wallet, auth+API, wallet+API) | 15 | 1.5 days |

**Week 5 Total: ~57 tests, 6 days effort**

### Week 6: Anvil + Smoke + Journey Tests
| # | Task | Tests | Effort |
|---|------|-------|--------|
| 33 | Anvil fixture setup + nightly CI pipeline | — | 1 day |
| 34 | Anvil fork tests (Hedgey claim on Optimism) | 3 | 1 day |
| 35 | Smoke tests (production health checks) | 8 | 0.5 day |
| 36 | Full journey E2E: applicant + admin flows | 2 | 1 day |
| 37 | Delete ~140 low-value tests (CSS, snapshots, element existence) | — | 1 day |
| 38 | React Query hook tests (cache keys, invalidation, retry) | 20 | 1 day |

**Week 6 Total: ~33 tests + cleanup, 5.5 days effort**

---

## Migration Plan (Sequencing)

```
Week 1: Factories → MSW Handlers → Render Utils → Setup.ts → Pure Logic Tests
         (nothing breaks, all additive)

Week 2: Hook Tests → Service Tests
         (start using new infrastructure, old setup still works in parallel)

Week 3: Wallet Hook Tests → RPC Failure Tests
         (exercise new mock wallet/transport utilities)

Week 4: Safe Tests → Remaining Services → Auth Integration
         (all boundaries now have unit coverage)

Week 5: Delete Cypress → Port specs → Rewrite Playwright → Cross-boundary
         (remove old framework, establish new E2E patterns)

Week 6: Anvil + Smoke + Journeys → Delete bad tests → Final cleanup
         (advanced testing, cleanup, CI hardening)
```

**Critical sequencing rules:**
- Cannot remove `tests/setup.js` until all tests use `__tests__/setup.ts` (Week 4-5)
- Cannot remove `moduleNameMapper` mock entries until corresponding `jest.mock()` calls are eliminated (gradual)
- Cannot remove Cypress until valuable specs are ported to Playwright (Week 5)
- Factories must exist before MSW handlers (factories feed handlers)
- MSW handlers must exist before integration tests (tests consume handlers)

---

## CI Pipeline

### Per-PR (< 8 minutes)
- **Lint**: 3 min
- **Unit tests**: 4 shards, 5 min total
- **Playwright E2E**: 2 shards, 8 min total (excludes `*.anvil.spec.ts`)

### Nightly (< 20 minutes)
- **Anvil fork tests**: Real Hedgey contract on forked Optimism
- **Contract validation**: MSW handler outputs vs staging API responses

### Post-Deploy (< 5 minutes)
- **Smoke tests**: Health check, homepage, key pages, API endpoints

### Naming Convention (Uniswap two-tier)
- `*.test.ts` — Vitest unit/integration
- `*.spec.ts` — Playwright E2E (mocked, per-PR)
- `*.anvil.spec.ts` — Playwright chain tests (nightly)
- `*.smoke.spec.ts` — Playwright smoke (post-deploy)

---

## Success Metrics: What 100/100 Means

| Metric | Current | Target |
|--------|---------|--------|
| Test files | 430 (many fake) | ~300 (all meaningful) |
| Coverage (lines) | 50% threshold | 70% threshold |
| Global vi.mock() calls | 50+ | 0 |
| Cypress files | 22 | 0 |
| E2E with real assertions | ~3 | 30+ |
| RPC failure tests | 0 | 20 |
| Cross-boundary tests | 0 | 15+ |
| Anvil fork tests | 0 | 5+ |
| Smoke tests | 0 | 8+ |
| Contract validation tests | 0 | 15+ |
| Bugs found by tests (not users) | Low | High |
| CI flake rate | Unknown | < 2% |

### The Trust Test (apply to every test)
> "If I delete the code this test covers, will this test fail?" → If no, delete the test.
> "If this test passes, can I ship without manually checking?" → If no, rewrite the test.

---

## Industry Alignment

| Pattern | Source Project | Applied To Karma |
|---------|--------------|-----------------|
| Playwright + Anvil fork | Uniswap, ENS | Anvil fixture + nightly chain tests |
| wagmi mock connector | Uniswap | Mock wallet in render utilities |
| Stateless/stateful split | ENS | `*.spec.ts` (stateless) vs `*.anvil.spec.ts` (stateful) |
| Two-tier naming | Uniswap | File naming convention |
| Snapshot/revert per test | All chain-testing projects | Anvil fixture design |
| Pinned fork blocks | Uniswap, ENS | `PINNED_BLOCKS` config |
| MSW composable handlers | Safe, Lido | Per-domain handler library |
| Test factories with overrides | Safe | Factory pattern |
| RPC failure testing | Nobody (we lead) | 20 failure scenario tests |
| No real MetaMask | All major projects | Mock at provider level |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Removing jest.mock() breaks existing tests | Migrate one directory at a time, old setup runs in parallel |
| Cypress removal loses coverage | Audit all 20 specs, port valuable ones first |
| MSW handler drift from real API | Contract tests + nightly staging validation |
| Privy SDK changes bypass behavior | Pin SDK version, dedicated bypass smoke test |
| Anvil tests slow/flaky | Nightly only, pinned blocks, snapshot/revert |
| Backend API shape changes | Zod contract schemas, CI validation step |

---

## Detailed Plans (Per Boundary)

The full detailed plans with every test case, mock code, and implementation notes are in the QA agent outputs:

- **QA #1 (Wallet)**: 215 tests — Hedgey claims, Safe proposals, gasless, chain switching, 20 RPC failure scenarios
- **QA #2 (Privy Auth)**: 183 tests — SDK loading, bridge pattern, cross-tab sync, permissions, 18 edge cases
- **QA #3 (Backend Requests)**: ~200 tests — fetchData, 10 services, React Query, contract testing, 3 bugs found
- **QA #4 (Integration)**: Shared infrastructure, cross-boundary tests, CI pipeline, migration sequencing, success metrics

## Jest → Vitest Migration (included in Phase 1)

The migration is the **first task** in the plan. It happens before any new tests are written, so all new infrastructure is built on Vitest from day one.

**What gets eliminated by moving to Vitest:**
- `jest.config.ts` (108 lines) → `vitest.config.ts` (~30 lines)
- `jest-resolver.js` → deleted
- `next/jest` wrapper → not needed
- 30+ `transformIgnorePatterns` entries → Vitest handles ESM natively
- 12+ `moduleNameMapper` mock redirects → `vite-tsconfig-paths` handles aliases
- `tests/setup.js` (300 lines of polyfills + mocks) → clean `__tests__/setup.ts`
- `tests/global.js` → deleted

**What stays the same:**
- `@testing-library/react` — works identically with Vitest
- `msw` — works identically with Vitest
- Test file locations — same `__tests__/` structure
- Playwright — completely separate, unaffected
