# Web3 Frontend Testing: Final Consensus Document

**Panel**: 3 Senior SWEs + 1 Tech Lead | **Round**: 3 (Final) | **Date**: 2026-03-23
**Projects Studied**: Uniswap, SushiSwap, Aave, Lido, 1inch, ENS, Safe (Global)
**Target**: Karma (Next.js 15 + wagmi v2 + viem v2 + RainbowKit + Privy + EAS + Gelato/ZeroDev + MongoDB indexer)

---

## Section 1: Executive Summary

The web3 frontend testing ecosystem is fragmented. No project has a complete, mature testing architecture -- every team has solved one layer well while leaving gaps elsewhere. The strongest transferable pattern comes from ENS: split tests into stateless (80%, no chain dependency, fast) and stateful (20%, requires chain state, slower). Karma should adopt Playwright as the sole E2E framework, remove Cypress, use a wagmi mock connector for the majority of wallet-connected tests, reserve Anvil fork testing for 5-10 critical transaction paths run nightly, and -- uniquely among web3 frontends -- invest in RPC failure mode testing, which is the single largest untested gap across the entire industry.

---

## Section 2: Industry Landscape

### Three Architectural Approaches

| Approach | Projects | Chain Layer | Wallet Layer | E2E Framework | Strengths | Weaknesses |
|----------|----------|-------------|--------------|---------------|-----------|------------|
| **Local Fork** | Uniswap, ENS, 1inch, Lido | Anvil (pinned block) | Custom mock connector / headless-web3-provider | Playwright (Uni, ENS), Cypress (1inch, Lido) | Fast, free, deterministic, no vendor lock-in | Must manage fork state, limited to single-chain per fork |
| **Cloud Fork** | Aave, Safe | Tenderly Virtual TestNets | Synpress / custom | Cypress | Multi-chain support, persistent state, shareable URLs | Vendor lock-in, API costs at scale, "latest" block = flaky |
| **No Frontend Tx Testing** | SushiSwap | N/A (unit/integration only) | N/A | Minimal E2E (navigation only) | Zero infra complexity | No confidence in tx flows, bugs found in production |

### Key Tool Versions in Production (as of research date)

| Tool | Version | Used By |
|------|---------|---------|
| Playwright | 1.48+ | Uniswap, ENS |
| Cypress | 13.x | Aave, Safe, Lido, 1inch |
| Anvil (foundry) | nightly | Uniswap, ENS, 1inch, Lido |
| Tenderly VTNs | v2 API | Aave, Safe |
| Synpress | 4.x | Safe (limited) |
| headless-web3-provider | 1.x | ENS |
| wagmi mock connector | custom | Uniswap (internal) |

### Consensus Observation

The Playwright-adopting projects (Uniswap, ENS) have measurably faster CI pipelines and fewer flaky tests than the Cypress holdouts. This is not a framework quality argument -- it reflects that Playwright adopters also tend to have more intentional test architecture overall. The correlation is adoption timing: teams that chose Playwright did so recently enough to also adopt modern practices (pinned blocks, snapshot/revert, stateless/stateful splits).

---

## Section 3: Key Debates Resolved

### 3.1 Wallet Mocking: wagmi Mock Connector (with escape hatch)

**Resolution**: Use a **wagmi mock connector** as the primary wallet mock for Layers 1-3. Reserve headless-web3-provider as an optional Layer 4 tool for the small set of Anvil-backed tests.

**Reasoning**:
- Karma already uses wagmi v2 throughout. A mock connector integrates at the same abstraction level the application code uses -- type-safe, no additional dependency, trivially maintained.
- headless-web3-provider's approval UX modeling and request queuing are genuinely valuable, but only matter for the ~20% of tests that exercise actual transaction signing. For the 80% of stateless tests (read flows, UI rendering with connected state, navigation), a mock connector is simpler and faster.
- SWE #2's point about automatic handling of new RPCs is valid but premature for Karma's current scope. Karma's transaction surface is EAS attestations + gasless relay -- a narrow RPC footprint, not a DEX with evolving swap router calls.
- The escape hatch: for Layer 4 Anvil tests that need realistic transaction flow (sign -> submit -> confirm), headless-web3-provider can be introduced later without architectural changes.

**Implementation**: See Section 4 for the concrete mock connector code.

### 3.2 Anvil Scope: Nightly, 5-10 Critical Paths

**Resolution**: Anvil fork tests run **nightly only** (not per-PR), covering 5-10 critical transaction paths. Per-PR tests use mocked chain state.

**Reasoning**:
- SWE #1 and Tech Lead's position wins on pragmatics: Anvil startup adds 3-8 seconds per test suite, fork syncing can add more, and Karma's team size does not support debugging Anvil-specific flakiness in PR checks.
- SWE #2's suggestion of Tenderly for staging/QA is noted but deferred. Karma operates on fewer chains (primarily Optimism, Arbitrum, Celo) than Aave's 7-chain matrix. Anvil handles this without vendor cost.
- SWE #3's stateful-only restriction is the right boundary: Anvil is only for tests that MUST verify on-chain state changes (attestation creation, gasless relay submission, multi-sig flows).
- Pin fork block numbers. No exceptions. Aave's "latest" approach causes 15-20% flake rate on their own admission.

**Critical paths for Karma's Anvil suite**:
1. Create project attestation (EAS)
2. Create grant attestation (EAS)
3. Submit milestone update
4. Gasless relay transaction (Gelato)
5. Gasless relay transaction (ZeroDev)
6. Multi-chain attestation (if applicable)
7. Token-gated access verification
8. Community admin role assignment on-chain

### 3.3 Synpress: Skip

**Resolution**: Do not evaluate Synpress. Build custom mocking.

**Reasoning**:
- 3 of 4 panelists agreed. SWE #2's counterpoint (low adoption reflects ecosystem maturity, not quality) is fair in the abstract, but does not change the calculus for Karma specifically.
- Every major project that invested in Synpress (Safe, partially) has written custom workarounds on top of it. The abstraction leaks.
- Karma uses Privy (not raw MetaMask) for auth. Synpress's primary value proposition -- automating MetaMask extension -- is irrelevant when the wallet connection is abstracted behind Privy's embedded wallet + social login.
- The maintenance burden of a browser extension automation layer for an attestation platform is unjustifiable.

### 3.4 RPC Failure Mode Testing: High Priority (Phase 2)

**Resolution**: This is a **Phase 2 priority**, not a deferral. Karma should be among the first web3 frontends to systematically test RPC failure modes.

**Reasoning**:
- SWE #3 identified the single most important insight from this research: **no major web3 project tests RPC failures at the frontend level**. Not Uniswap. Not Aave. Not ENS. Zero projects test what happens when `eth_sendTransaction` times out, when gas estimation returns an error, when a nonce collision occurs, or when the RPC endpoint is unreachable.
- For Karma specifically, this matters MORE than for a DEX. Attestation creation is a multi-step process (sign -> submit -> index -> verify) where any step can fail. Users lose work if the frontend doesn't handle mid-flow failures gracefully.
- The implementation is straightforward: a custom viem transport wrapper that can inject failures (timeout, revert, nonce error, gas estimation failure) on demand. This is a testing utility, not infrastructure.

**Concrete failure modes to test**:
- RPC endpoint unreachable (network error)
- RPC endpoint slow (>10s response)
- `eth_estimateGas` returns error
- `eth_sendTransaction` reverts
- Transaction stuck in mempool (no confirmation after N blocks)
- Nonce too low (concurrent transaction)
- User rejects signature in wallet
- Gasless relay returns quota exceeded

### 3.5 Visual Regression: Deferred to Phase 3

**Resolution**: Adopt Playwright's built-in screenshot comparison initially. Evaluate Chromatic or Argos CI after the design system stabilizes.

**Reasoning**:
- SWE #3 and Tech Lead agree on the trajectory. SWE #1 and #2 not prioritizing it is the right instinct for now.
- Karma's UI is actively evolving (tenant theming, rebranding from GAP to Karma). Visual regression testing against a moving design target generates noise, not signal.
- Playwright screenshots on failure (already configured in Karma's `playwright.config.ts`) provide 80% of the value. Intentional visual regression suites should wait until:
  (a) The design system has a Storybook with stable component states
  (b) Tenant theming is finalized
  (c) The team has bandwidth to review visual diffs in CI

---

## Section 4: Recommended Architecture for Karma

### Testing Pyramid

```
                    /\
                   /  \
                  / L4 \          Anvil Fork E2E (5-10 tests)
                 / anvil \        Nightly only. Real chain state.
                /----------\
               /    L3      \     Playwright E2E (30-50 tests)
              /  playwright   \   Per-PR. Mocked wallet + API.
             /----------------\
            /       L2         \  Component Integration (100+ tests)
           /   jest + rtl +     \ Per-PR. Components with mocked
          /    msw + mock wagmi  \  backends. The "missing middle."
         /------------------------\
        /          L1              \  Unit Tests (200+ tests)
       /    jest + rtl (pure)       \ Per-PR. Pure functions, hooks,
      /                              \  utilities, rendering.
     /________________________________\
```

### Layer Details

| Layer | Name | Tools | What It Tests | Run When | Target Count | Max Duration |
|-------|------|-------|---------------|----------|--------------|--------------|
| **L1** | Unit | Jest 29 + RTL 16 | Pure functions, hooks, utilities, component rendering without side effects | Every PR | 200+ | <60s |
| **L2** | Component Integration | Jest 29 + RTL 16 + MSW 2.x + wagmi mock connector | Components connected to mocked API/chain backends. Loading, error, empty states. Form submission flows. | Every PR | 100+ | <120s |
| **L3** | Browser E2E | Playwright 1.58 | Full user journeys with mocked wallet and mocked/real API. Navigation, auth flows, RBAC visibility, multi-page workflows. | Every PR | 30-50 | <5min |
| **L4** | Chain E2E | Playwright 1.58 + Anvil + headless-web3-provider (optional) | Real transaction signing against local fork. Attestation CRUD. Gasless relay. On-chain state verification. | Nightly + pre-release | 5-10 | <10min |

### Tool Choices with Versions

```json
{
  "devDependencies": {
    "@playwright/test": "^1.58.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "msw": "^2.12.0",
    "viem": "^2.x (already installed)",
    "wagmi": "^2.x (already installed)"
  },
  "optionalDependencies (Phase 2+)": {
    "headless-web3-provider": "^1.0.0"
  },
  "remove": {
    "cypress": "current",
    "start-server-and-test": "current",
    "@cypress/code-coverage": "if present"
  }
}
```

### File/Directory Structure

```
gap-app-v2/
  __tests__/
    unit/                           # L1: Pure unit tests
      hooks/
        useProjectData.test.ts
      utilities/
        formatAttestation.test.ts
      components/
        ProjectCard.test.tsx
    integration/                    # L2: Component integration
      components/
        ProjectForm.integration.test.tsx
        AttestationFlow.integration.test.tsx
      pages/
        ProjectPage.integration.test.tsx
    fixtures/                       # Shared test data
      factories/
        project.factory.ts
        attestation.factory.ts
        user.factory.ts
      mocks/
        handlers.ts                 # MSW request handlers
        wagmi-mock-connector.ts     # Reusable mock connector
        rpc-failure-transport.ts    # Failure injection (Phase 2)
    setup/
      jest.setup.ts
      msw-server.ts

  e2e/
    playwright.config.ts            # Already exists
    tests/
      # L3: Browser E2E (stateless - no chain dependency)
      auth/
        authentication.spec.ts      # Already exists
        rbac-visibility.spec.ts     # Already exists
      applications/
        browse-applications.spec.ts # Already exists
        apply-flow.spec.ts          # Already exists
      programs/
        programs-list.spec.ts       # Already exists
      infrastructure/
        routing.spec.ts             # Already exists
        seo.spec.ts                 # Already exists

      # L4: Chain E2E (stateful - requires Anvil)
      chain/                        # NEW directory
        attestation-create.anvil.spec.ts
        gasless-relay.anvil.spec.ts
        milestone-update.anvil.spec.ts
    fixtures/
      anvil-setup.ts                # Fork config, pinned blocks
      chain-helpers.ts              # Snapshot/revert utilities
      wallet-setup.ts               # Mock connector for Playwright

  cypress/                          # TO BE REMOVED (Phase 1)
```

### Naming Convention (Two-Tier, from Uniswap)

```
*.test.ts          -> L1/L2 Jest tests (unit + component integration)
*.spec.ts          -> L3 Playwright tests (browser E2E, no chain)
*.anvil.spec.ts    -> L4 Playwright tests (chain E2E, requires Anvil)
```

### CI Pipeline Design

```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  # ---- PER-PR JOBS (L1 + L2 + L3) ----

  unit-and-integration:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test:coverage
        env:
          NODE_OPTIONS: --max-old-space-size=4096

  playwright-e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      - run: pnpm e2e:pw
        # Exclude *.anvil.spec.ts from PR runs
        env:
          PLAYWRIGHT_GREP_INVERT: anvil
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: gap-app-v2/e2e/test-results/

  # ---- NIGHTLY JOB (L4) ----

  chain-e2e-nightly:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: foundry-rs/foundry-toolchain@v1
        with:
          version: nightly
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm build
      # Start Anvil fork in background
      - run: |
          anvil --fork-url ${{ secrets.OPTIMISM_RPC_URL }} \
                --fork-block-number 125000000 \
                --port 8545 &
          sleep 3
      - run: pnpm e2e:pw -- --grep anvil
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: chain-e2e-report
          path: gap-app-v2/e2e/test-results/
```

### wagmi Mock Connector (Core Utility)

```typescript
// __tests__/fixtures/mocks/wagmi-mock-connector.ts
import { createConnector } from "wagmi";
import { type Address, type Chain } from "viem";
import { optimism } from "viem/chains";

interface MockConnectorOptions {
  address?: Address;
  chainId?: number;
  chain?: Chain;
}

const DEFAULT_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const; // Anvil account 0

export function createMockWagmiConnector(options: MockConnectorOptions = {}) {
  const {
    address = DEFAULT_ADDRESS,
    chainId = optimism.id,
    chain = optimism,
  } = options;

  return createConnector((config) => ({
    id: "mock",
    name: "Mock Connector",
    type: "mock" as const,

    async connect() {
      return {
        accounts: [address],
        chainId,
      };
    },

    async disconnect() {},

    async getAccounts() {
      return [address];
    },

    async getChainId() {
      return chainId;
    },

    async getProvider() {
      return undefined;
    },

    async isAuthorized() {
      return true;
    },

    async switchChain({ chainId: newChainId }) {
      return chain;
    },

    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }));
}
```

### RPC Failure Transport (Phase 2 Utility)

```typescript
// __tests__/fixtures/mocks/rpc-failure-transport.ts
import { custom, type EIP1193RequestFn } from "viem";

type FailureMode =
  | "timeout"
  | "network-error"
  | "gas-estimation-error"
  | "nonce-too-low"
  | "revert"
  | "quota-exceeded";

interface FailureConfig {
  method: string;        // e.g., "eth_sendTransaction", "eth_estimateGas"
  failure: FailureMode;
  delayMs?: number;      // For timeout simulation
}

export function createFailingTransport(
  baseTransport: EIP1193RequestFn,
  failures: FailureConfig[]
) {
  const failureMap = new Map(failures.map((f) => [f.method, f]));

  return custom({
    async request({ method, params }) {
      const failure = failureMap.get(method);

      if (!failure) {
        return baseTransport({ method, params });
      }

      switch (failure.failure) {
        case "timeout":
          await new Promise((resolve) =>
            setTimeout(resolve, failure.delayMs ?? 30_000)
          );
          throw new Error("Request timed out");

        case "network-error":
          throw new Error("Failed to fetch");

        case "gas-estimation-error":
          throw new Error("execution reverted: gas estimation failed");

        case "nonce-too-low":
          throw new Error("nonce too low");

        case "revert":
          throw new Error("execution reverted");

        case "quota-exceeded":
          throw new Error("relay quota exceeded");
      }
    },
  });
}
```

---

## Section 5: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Remove Cypress, establish L1/L2 patterns, validate Playwright E2E.

| Deliverable | Details | Owner |
|-------------|---------|-------|
| Remove Cypress | Delete `cypress/` directory, remove Cypress deps from `package.json`, remove `e2e`, `e2e:headless`, `e2e:ci`, `component`, `component:headless` scripts. Remove `start-server-and-test`. | Any |
| Migrate valuable Cypress tests | Port `cypress/e2e/donation/donation-flow.cy.ts`, `cypress/e2e/navbar/*.cy.ts`, and `cypress/e2e/project/*.cy.ts` to Playwright specs in `e2e/tests/`. The `e2e/tests/` directory already has auth, applications, claims, programs, and infrastructure specs -- fill remaining gaps. | Frontend |
| Create wagmi mock connector | `__tests__/fixtures/mocks/wagmi-mock-connector.ts` as shown above. | Frontend |
| Create MSW handler library | `__tests__/fixtures/mocks/handlers.ts` with handlers for indexer API endpoints (`/api/v2/projects`, `/api/v2/grants`, `/api/v2/attestations`). | Frontend |
| Create test factories | `__tests__/fixtures/factories/` with `project.factory.ts`, `attestation.factory.ts`, `user.factory.ts`. Use `@faker-js/faker`. | Frontend |
| Write 5 L2 integration tests | Target the most complex components: `ProjectForm`, `GrantApplication`, `AttestationFlow`, `MilestoneUpdate`, `CommunityDashboard`. Each test covers loading, success, empty, and error states. | Frontend |
| Update CI pipeline | Add the workflow from Section 4. Remove Cypress CI job. Add `PLAYWRIGHT_GREP_INVERT: anvil` to exclude chain tests from PR runs. | DevOps |

### Phase 2: Depth (Weeks 3-4)

**Goal**: RPC failure testing, Anvil chain tests, component integration coverage.

| Deliverable | Details | Owner |
|-------------|---------|-------|
| RPC failure transport | `__tests__/fixtures/mocks/rpc-failure-transport.ts` as shown above. | Frontend |
| 8 RPC failure tests | Test all 8 failure modes listed in Section 3.4 against key components: `AttestationCreateButton`, `GaslessRelaySubmit`, `MilestoneUpdateForm`. Verify the UI shows appropriate error states, retry buttons, and does not lose user input. | Frontend |
| Anvil fixture setup | `e2e/fixtures/anvil-setup.ts`: fork config for Optimism at pinned block, snapshot/revert helpers, funded test accounts. | Backend/Infra |
| 5 Anvil E2E tests | The first 5 critical paths from Section 3.2: create project attestation, create grant attestation, submit milestone, gasless relay (Gelato), gasless relay (ZeroDev). | Frontend + Backend |
| Nightly CI job | Add `chain-e2e-nightly` job with cron schedule (`0 3 * * *`). Alert on Slack/Discord on failure. | DevOps |
| 20 more L2 integration tests | Expand component integration coverage to all data-fetching components. Target: every component that uses `useQuery` or `useMutation` has at least one integration test. | Frontend |

### Phase 3: Maturity (Weeks 5-8)

**Goal**: Visual regression, full coverage, documentation.

| Deliverable | Details | Owner |
|-------------|---------|-------|
| Remaining Anvil tests | Paths 6-8 from Section 3.2: multi-chain attestation, token-gated access, community admin role assignment. | Frontend |
| Visual regression baseline | Enable Playwright screenshot comparison for 10 critical pages. Store baselines in repo. Use `expect(page).toHaveScreenshot()` with `maxDiffPixelRatio: 0.01`. | Frontend |
| Evaluate Chromatic/Argos | If Storybook coverage is sufficient, run a 2-week trial of Chromatic CI. Compare cost/value vs Playwright screenshots. | Tech Lead |
| headless-web3-provider evaluation | For the Anvil tests, compare current wagmi mock approach vs headless-web3-provider. If it reduces test code by >30% or catches bugs the mock missed, adopt it. | Frontend |
| Coverage gates | Enforce in CI: L1+L2 coverage >= 70% (lines). Playwright E2E: all critical paths green. Nightly chain E2E: all paths green. | DevOps |
| Testing playbook | Document patterns, fixtures, mock strategies in `docs/testing/`. Not for Claude -- for human onboarding. | Documentation |

---

## Section 6: Patterns to Steal

### Pattern 1: ENS Stateless/Stateful Split

**Source**: ENS (ens-app-v3)
**Why it matters**: ENS's test suite runs 400+ tests in under 3 minutes by categorizing every test as either stateless (no chain dependency) or stateful (requires fork). Stateless tests run in parallel with mocked data. Stateful tests run sequentially with Anvil snapshot/revert.

**How to adapt for Karma**:
```typescript
// e2e/fixtures/anvil-setup.ts
import { test as base, expect } from "@playwright/test";

// Stateless test -- use for 80% of E2E
export const test = base.extend({
  // Mock API responses, mock wallet
});

// Stateful test -- use for chain tests only
export const chainTest = base.extend({
  anvil: async ({}, use) => {
    // Snapshot before test
    const snapshotId = await anvilClient.request({
      method: "evm_snapshot",
      params: [],
    });
    await use(anvilClient);
    // Revert after test
    await anvilClient.request({
      method: "evm_revert",
      params: [snapshotId],
    });
  },
});
```

### Pattern 2: Uniswap Two-Tier Naming Convention

**Source**: Uniswap (interface)
**Why it matters**: CI can grep file names to partition test suites without configuration changes. Fast tests never wait for slow infrastructure.

**How to adapt for Karma**:
```
# In CI, exclude anvil tests from PR checks:
playwright test --grep-invert anvil

# In nightly, run only anvil tests:
playwright test --grep anvil
```

File naming enforces the boundary:
- `browse-applications.spec.ts` -- runs on every PR
- `attestation-create.anvil.spec.ts` -- runs nightly only

### Pattern 3: Uniswap Pinned Fork Block with Deterministic Accounts

**Source**: Uniswap, ENS
**Why it matters**: Aave uses "latest" block for forks and accepts 15-20% flake rate. Uniswap/ENS pin block numbers and achieve near-zero fork-related flakiness.

**How to adapt for Karma**:
```typescript
// e2e/fixtures/anvil-setup.ts
export const FORK_CONFIG = {
  optimism: {
    rpcUrl: process.env.OPTIMISM_RPC_URL,
    blockNumber: 125_000_000, // Pinned. Update quarterly.
    chainId: 10,
  },
  arbitrum: {
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    blockNumber: 275_000_000,
    chainId: 42161,
  },
} as const;

// Known funded accounts at these block numbers
export const TEST_ACCOUNTS = {
  projectOwner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  reviewer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  communityAdmin: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
} as const;
```

### Pattern 4: Safe's Test Data Factory Pattern

**Source**: Safe (safe-wallet-web)
**Why it matters**: Safe builds complex test scenarios from composable factories. Each factory produces a valid object with sensible defaults that can be overridden. This eliminates the "copy-paste fixture" problem where test data drifts from reality.

**How to adapt for Karma**:
```typescript
// __tests__/fixtures/factories/attestation.factory.ts
import { faker } from "@faker-js/faker";
import type { Attestation } from "@/types/attestation";

export function createMockAttestation(
  overrides?: Partial<Attestation>
): Attestation {
  return {
    uid: faker.string.hexadecimal({ length: 64, prefix: "0x" }),
    schema: "0x..." as const,
    attester: faker.finance.ethereumAddress(),
    recipient: faker.finance.ethereumAddress(),
    time: BigInt(faker.date.recent().getTime()),
    revocable: true,
    revoked: false,
    data: {
      projectName: faker.company.name(),
      description: faker.lorem.paragraph(),
    },
    ...overrides,
  };
}

// Usage in tests:
const revokedAttestation = createMockAttestation({ revoked: true });
const specificProject = createMockAttestation({
  data: { projectName: "Karma", description: "Attestation platform" },
});
```

### Pattern 5: Lido's MSW Handler Composition

**Source**: Lido (lido-frontend)
**Why it matters**: Lido composes MSW handlers from modules -- each API domain has its own handler file, and tests compose only the handlers they need. This prevents "god mock" files and makes it obvious which API surface a test depends on.

**How to adapt for Karma**:
```typescript
// __tests__/fixtures/mocks/handlers/projects.ts
import { http, HttpResponse } from "msw";
import { createMockProject } from "../factories/project.factory";

export const projectHandlers = [
  http.get("*/api/v2/projects/:id", ({ params }) => {
    return HttpResponse.json(createMockProject({ id: params.id as string }));
  }),
  http.get("*/api/v2/projects", () => {
    return HttpResponse.json({
      data: [createMockProject(), createMockProject()],
      total: 2,
    });
  }),
];

// __tests__/fixtures/mocks/handlers/attestations.ts
export const attestationHandlers = [ /* ... */ ];

// __tests__/fixtures/mocks/handlers.ts (compose)
import { projectHandlers } from "./handlers/projects";
import { attestationHandlers } from "./handlers/attestations";

export const defaultHandlers = [
  ...projectHandlers,
  ...attestationHandlers,
];

// In a specific test, override one handler:
server.use(
  http.get("*/api/v2/projects/:id", () => {
    return HttpResponse.json(null, { status: 404 });
  })
);
```

---

## Section 7: Anti-Patterns to Avoid

### Anti-Pattern 1: "Latest" Fork Block (Aave)

Aave forks from the latest block, which means test behavior depends on the state of mainnet at test time. A whale moving funds, a governance proposal executing, or a token price changing can break tests. Pin your block numbers. Update them quarterly on a schedule, not reactively when tests break.

### Anti-Pattern 2: Two E2E Frameworks in Parallel (Karma's Current State)

Karma currently runs both Cypress (`cypress/e2e/`) and Playwright (`e2e/tests/`). This is the single highest-priority cleanup. Two frameworks mean two sets of helpers, two CI jobs, two mental models, two sets of flaky-test-debugging skills. Every project we studied that ran two frameworks eventually consolidated. Do it now, not later.

### Anti-Pattern 3: Testing Wallet Connection UX with Real Extensions (Synpress/Dappwright)

Safe invested significant effort automating MetaMask via Synpress. The tests are slow (browser extension installation per run), brittle (MetaMask updates break selectors), and test something the wallet vendor is responsible for. Mock the wallet at the provider level. Test YOUR code, not MetaMask's popup.

### Anti-Pattern 4: E2E Tests as the Primary Integration Strategy (SushiSwap's Gap)

SushiSwap has almost no integration testing between their components and their data layer. They either have unit tests (pure) or E2E tests (full browser). The "middle layer" -- components rendered with mocked backends, verifying data flow without a browser -- is missing. This is exactly the gap SWE #2 identified. Karma's L2 layer addresses this. Do not skip it.

### Anti-Pattern 5: Global Test State Without Snapshot/Revert (Early 1inch)

1inch's early chain tests shared state across tests -- one test's transaction would affect the next test's balance. This caused cascade failures where a single test failure broke all subsequent tests. Every chain-dependent test must snapshot before and revert after. Non-negotiable.

---

## Section 8: Open Questions

### 8.1: Privy Auth Bypass Strategy for E2E

Karma uses Privy for authentication, which involves third-party OAuth/email flows that cannot be automated in E2E tests. The current approach (`NEXT_PUBLIC_E2E_AUTH_BYPASS=true`) suggests an env-based bypass exists. **Open question**: Is this bypass sufficient for all RBAC roles (reviewer, community admin, staff)? Does it handle Privy's embedded wallet creation? If not, we may need a more sophisticated auth fixture that seeds Privy-like session tokens directly.

### 8.2: Gasless Relay Testing Without Live Relay Infrastructure

Gelato and ZeroDev relay transactions require live infrastructure (relay servers, bundlers). **Open question**: Can we mock the relay at the SDK level (intercept `GelatoRelay.callWithSyncFee()`) for L2/L3 tests, or do we need a local relay simulator? For L4 Anvil tests, do we need a Gelato/ZeroDev staging environment, or can we bypass the relay and submit transactions directly to the fork?

### 8.3: Multi-Tenant Visual Regression Scope

Karma supports white-label tenants with different themes. **Open question**: Should visual regression tests run against multiple tenant themes, or only the default Karma theme? Running against N tenants multiplies the visual diff surface by N. The cost-benefit analysis depends on how many tenants actively exist and how divergent their themes are. This needs data from the product team before deciding.
