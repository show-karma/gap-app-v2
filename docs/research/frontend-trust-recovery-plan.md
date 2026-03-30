# Frontend Trust Recovery Plan: 0 → 100 Trustworthiness

**Target**: gap-app-v2 | **Date**: 2026-03-24
**Goal**: When tests pass, ship with confidence. When tests fail, something is actually broken.

---

## The Problem

430 test files that test almost nothing real:
- **170 tests to DELETE** — CSS class assertions, snapshots, `expect(body).toBeVisible()`
- **120 tests to REWRITE** — right idea, wrong execution (mocked everything, no real behavior)
- **130 tests to KEEP** — RBAC, pure utilities, core logic
- **Global setup.js has 50+ jest.mock() calls** that hide all real integration issues
- **Zero smoke tests** against production
- **Zero contract tests** validating frontend mocks match real API

---

## Phase 0: Stop the Bleeding (Day 1)

### 0.1 Delete False Confidence Tests

Delete tests that pass when the feature is broken. These are actively harmful — they give green checkmarks that mean nothing.

**DELETE targets (170+ files):**

| Category | Count | Why Delete |
|----------|-------|-----------|
| CSS class assertions (`toHaveClass("bg-brand-500")`) | ~80 | Tests Tailwind config, not behavior |
| Snapshot files (`.snap`) | ~40 | Brittle, never reviewed, no behavior |
| Element existence (`cy.get("nav").should("exist")`) | ~15 | Passes even if nav is broken |
| `expect(body).toBeVisible()` Playwright tests | ~10 | Literally always true |
| Empty/trivial renders ("renders without crashing") | ~25 | Zero signal |

**How to identify them:**
```bash
# Find CSS class assertion tests
grep -rl "toHaveClass" __tests__/components/ | wc -l

# Find meaningless Playwright assertions
grep -rl 'locator("body").toBeVisible' e2e/tests/ | wc -l

# Find element-existence-only Cypress tests
grep -rl 'should("exist")' cypress/e2e/ | wc -l
```

### 0.2 Delete Cypress Entirely

Karma has both Cypress (22 files) AND Playwright (16 files). Two frameworks = split effort, double maintenance, neither trusted.

**Action:**
- Delete `cypress/` directory
- Remove Cypress from `package.json`
- Remove `start-server-and-test`, `@cypress/*` deps
- Remove Cypress CI workflow
- Migrate the 3-4 unique Cypress flows (donation, navbar) to Playwright later

### 0.3 Fix Global Mock Pollution

**The single biggest trust killer**: `tests/setup.js` has 50+ `jest.mock()` calls that blanket the entire test suite.

```javascript
// CURRENT: Every test sees this — no test ever validates real auth
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(() => ({ ready: true, authenticated: false, user: null })),
}));

// CURRENT: Every test sees disconnected wallet
jest.mock("wagmi", () => ({
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false })),
}));
```

**Action:**
- Remove Privy, wagmi, gasless, and domain-specific mocks from global setup
- Keep ONLY environment/polyfill mocks in setup (TextEncoder, IntersectionObserver, fetch, etc.)
- Each test file mocks only what IT needs
- Create mock factories (see Phase 1)

**Result after Phase 0:** ~260 remaining tests that at least test something real. Coverage number drops (good — it was lying). Suite runs faster.

---

## Phase 1: Build the Trust Foundation (Week 1)

### 1.1 Create Mock Factories (Replace Hardcoded Mocks)

Instead of 50 global mocks, create composable factories that tests opt into:

```typescript
// __tests__/fixtures/factories/auth.factory.ts
import type { PrivyUser } from "@privy-io/react-auth";

export function createAuthState(overrides?: Partial<AuthState>) {
  return {
    ready: true,
    authenticated: false,
    user: null,
    wallets: [],
    ...overrides,
  };
}

export function createAuthenticatedUser(overrides?: Partial<PrivyUser>) {
  return createAuthState({
    authenticated: true,
    user: {
      id: "did:privy:test-user-1",
      wallet: { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
      email: { address: "test@karma.xyz" },
      ...overrides,
    },
  });
}

export function createCommunityAdmin() {
  return createAuthenticatedUser({
    id: "did:privy:community-admin-1",
  });
}
```

```typescript
// __tests__/fixtures/factories/application.factory.ts
import { faker } from "@faker-js/faker";

export function createMockApplication(overrides?: Partial<Application>) {
  return {
    id: faker.string.uuid(),
    referenceNumber: `APP-${faker.string.numeric(6)}`,
    status: "DRAFT",
    programId: faker.string.uuid(),
    applicantEmail: faker.internet.email(),
    createdAt: faker.date.recent().toISOString(),
    milestones: [],
    ...overrides,
  };
}

export function createSubmittedApplication() {
  return createMockApplication({ status: "SUBMITTED" });
}

export function createApplicationList(count: number) {
  return Array.from({ length: count }, () => createMockApplication());
}
```

### 1.2 Create MSW Contract Handlers (Replace Fake Mocks)

The current MSW handlers return hardcoded shapes that may not match the real API. Fix this:

```typescript
// __tests__/fixtures/mocks/handlers/applications.handler.ts
import { http, HttpResponse } from "msw";
import { createMockApplication } from "../factories/application.factory";

// These handlers MUST match the real API response shape.
// If the backend changes, update these handlers AND the types.
export const applicationHandlers = [
  // List applications for a program
  http.get("*/v2/funding-applications/program/:programId", ({ params, request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "10");

    return HttpResponse.json({
      payload: createApplicationList(limit),
      pagination: { page: 1, limit, total: limit, hasNext: false },
    });
  }),

  // Submit application
  http.post("*/v2/funding-applications/:programId", async ({ request }) => {
    const body = await request.json();

    // Validate request shape matches what backend expects
    if (!body.applicantEmail || !body.data) {
      return HttpResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: createMockApplication({ status: "SUBMITTED", ...body }),
    });
  }),

  // Error scenario handler (opt-in)
  http.get("*/v2/funding-applications/program/error-program", () => {
    return HttpResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }),
];
```

```typescript
// __tests__/fixtures/mocks/handlers/index.ts
import { applicationHandlers } from "./applications.handler";
import { authHandlers } from "./auth.handler";
import { communityHandlers } from "./community.handler";
import { payoutHandlers } from "./payout.handler";

export const defaultHandlers = [
  ...authHandlers,
  ...applicationHandlers,
  ...communityHandlers,
  ...payoutHandlers,
];
```

### 1.3 Create Test Rendering Utilities

Instead of each test file setting up providers differently:

```typescript
// __tests__/fixtures/render-with-providers.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAuthState, type AuthState } from "./factories/auth.factory";

interface RenderOptions {
  auth?: Partial<AuthState>;
  route?: string;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions = {}
) {
  const { auth, route = "/", queryClient = createTestQueryClient() } = options;

  const authState = createAuthState(auth);

  // Mock Privy at the provider level, not globally
  jest.spyOn(require("@privy-io/react-auth"), "usePrivy").mockReturnValue(authState);

  if (auth?.authenticated && authState.user?.wallet) {
    jest.spyOn(require("wagmi"), "useAccount").mockReturnValue({
      address: authState.user.wallet.address,
      isConnected: true,
    });
  }

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}
```

### 1.4 Write the 6 P0 Tests That Actually Matter

These are the tests that, if they pass, give you real confidence:

#### Test 1: Application Submission (Happy + Error)

```typescript
// src/features/applications/hooks/__tests__/use-application-submit.trust.test.tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { server } from "@tests/fixtures/mocks/server";
import { http, HttpResponse } from "msw";
import { useApplicationSubmit } from "../use-application-submit";
import { renderWithProviders } from "@tests/fixtures/render-with-providers";
import { createAuthenticatedUser } from "@tests/fixtures/factories/auth.factory";

describe("Application Submission [TRUST]", () => {
  test("submits application and invalidates cache", async () => {
    const { result } = renderHook(() => useApplicationSubmit("program-1"), {
      wrapper: ({ children }) =>
        renderWithProviders(children, {
          auth: createAuthenticatedUser(),
        }),
    });

    await act(async () => {
      await result.current.submitMutation.mutateAsync({
        data: { projectName: "Test Project" },
        applicantEmail: "test@example.com",
      });
    });

    expect(result.current.submitMutation.isSuccess).toBe(true);
    // Verify the correct endpoint was called (not just that mock returned data)
  });

  test("shows error when API returns 500", async () => {
    server.use(
      http.post("*/v2/funding-applications/:programId", () => {
        return HttpResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useApplicationSubmit("program-1"), {
      wrapper: ({ children }) =>
        renderWithProviders(children, {
          auth: createAuthenticatedUser(),
        }),
    });

    await act(async () => {
      try {
        await result.current.submitMutation.mutateAsync({
          data: { projectName: "Test Project" },
          applicantEmail: "test@example.com",
        });
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.submitMutation.isError).toBe(true);
  });

  test("shows error when network is down", async () => {
    server.use(
      http.post("*/v2/funding-applications/:programId", () => {
        return HttpResponse.error(); // Network error
      })
    );

    // ... same pattern, verify error state
  });

  test("rejects when user is not authenticated", async () => {
    // Render without auth — verify mutation is disabled or throws
  });
});
```

#### Test 2: Permission Enforcement (RBAC Boundaries)

```typescript
// src/core/rbac/__tests__/permission-enforcement.trust.test.ts
describe("Permission Enforcement [TRUST]", () => {
  test("GUEST cannot submit applications", () => {
    const can = checkPermission("GUEST", "APPLICATION_SUBMIT");
    expect(can).toBe(false);
  });

  test("APPLICANT can submit but not review", () => {
    expect(checkPermission("APPLICANT", "APPLICATION_SUBMIT")).toBe(true);
    expect(checkPermission("APPLICANT", "APPLICATION_REVIEW")).toBe(false);
  });

  test("PROGRAM_REVIEWER can review but not approve payouts", () => {
    expect(checkPermission("PROGRAM_REVIEWER", "APPLICATION_REVIEW")).toBe(true);
    expect(checkPermission("PROGRAM_REVIEWER", "PAYOUT_CREATE")).toBe(false);
  });

  test("COMMUNITY_ADMIN can create payouts", () => {
    expect(checkPermission("COMMUNITY_ADMIN", "PAYOUT_CREATE")).toBe(true);
  });

  test("role hierarchy is enforced (higher inherits lower)", () => {
    // COMMUNITY_ADMIN should have all APPLICANT permissions
    const applicantPerms = getPermissionsForRole("APPLICANT");
    const adminPerms = getPermissionsForRole("COMMUNITY_ADMIN");
    for (const perm of applicantPerms) {
      expect(adminPerms).toContain(perm);
    }
  });
});
```

#### Test 3: Payout Disbursement State Machine

```typescript
// src/features/payout-disbursement/__tests__/disbursement-flow.trust.test.tsx
describe("Payout Disbursement [TRUST]", () => {
  test("status transitions: PENDING → AWAITING_SIGNATURE → SIGNED → CONFIRMED", async () => {
    // Create disbursement → verify PENDING
    // Record Safe tx → verify AWAITING_SIGNATURE
    // Confirm → verify CONFIRMED
    // Each step invalidates correct cache keys
  });

  test("cannot skip states (PENDING → CONFIRMED is rejected)", async () => {
    // Try to confirm a PENDING disbursement → should fail
  });

  test("only COMMUNITY_ADMIN can create disbursements", async () => {
    // Render with APPLICANT role → verify create is disabled/rejected
  });

  test("payout amount matches sum of approved milestones", async () => {
    // Create disbursement with 3 approved milestones
    // Verify total amount = sum of milestone amounts
  });
});
```

#### Test 4: Auth Flow (Login → Session → Logout)

```typescript
// src/contexts/__tests__/auth-flow.trust.test.tsx
describe("Authentication Flow [TRUST]", () => {
  test("unauthenticated user sees login button", async () => {
    renderWithProviders(<Header />, { auth: { authenticated: false } });
    expect(screen.getByRole("button", { name: /login|connect/i })).toBeInTheDocument();
  });

  test("authenticated user sees their address/name", async () => {
    renderWithProviders(<Header />, {
      auth: createAuthenticatedUser(),
    });
    await waitFor(() => {
      expect(screen.getByText(/0xf39F/i)).toBeInTheDocument();
    });
  });

  test("401 from API triggers logout", async () => {
    server.use(
      http.get("*/v2/auth/permissions", () => {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
      })
    );

    // Render authenticated → verify redirect to login or logout called
  });

  test("expired token detected on page load", async () => {
    // Set expired token in localStorage → verify Privy logout called
  });
});
```

#### Test 5: Claim Funds (Gasless + Fallback)

```typescript
// src/features/claim-funds/__tests__/claim-flow.trust.test.tsx
describe("Claim Funds [TRUST]", () => {
  test("eligible user sees claim amount and button", async () => {
    server.use(
      http.get("*/v2/claim-grants/:tenantId/:address/eligibility", () => {
        return HttpResponse.json({
          eligible: true,
          amount: "1000000000000000000", // 1 ETH
          proof: ["0xabc..."],
        });
      })
    );

    // Render claim page → verify amount displayed
    // Verify claim button enabled
  });

  test("already-claimed user sees zero amount", async () => {
    server.use(
      http.get("*/v2/claim-grants/:tenantId/:address/eligibility", () => {
        return HttpResponse.json({ eligible: false, amount: "0", proof: [] });
      })
    );

    // Verify claim button disabled
    // Verify "already claimed" message
  });

  test("gasless path used when ZeroDev available", async () => {
    // Mock ZeroDev config as available
    // Verify transaction submitted without gas fee
  });

  test("falls back to user-pays when ZeroDev unavailable", async () => {
    // Mock ZeroDev as unavailable
    // Verify user prompted about gas fee
  });
});
```

#### Test 6: API Error Handling (All Status Codes)

```typescript
// __tests__/integration/api-error-handling.trust.test.tsx
describe("API Error Handling [TRUST]", () => {
  test("500 shows user-friendly error, not stack trace", async () => {
    server.use(
      http.get("*/v2/communities/:slug", () => {
        return HttpResponse.json({ error: "Internal error" }, { status: 500 });
      })
    );

    renderWithProviders(<CommunityPage slug="test" />);
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.queryByText(/internal error/i)).not.toBeInTheDocument();
    });
  });

  test("403 shows permission denied for specific action", async () => {
    server.use(
      http.post("*/v2/funding-applications/:id", () => {
        return HttpResponse.json({ error: "Forbidden" }, { status: 403 });
      })
    );

    // Verify "You don't have permission" message, not generic error
  });

  test("429 shows rate limit message without retrying", async () => {
    let callCount = 0;
    server.use(
      http.get("*/v2/communities/:slug", () => {
        callCount++;
        return HttpResponse.json({ error: "Too many requests" }, { status: 429 });
      })
    );

    renderWithProviders(<CommunityPage slug="test" />);
    await waitFor(() => {
      expect(callCount).toBe(1); // No automatic retry
      expect(screen.getByText(/try again later/i)).toBeInTheDocument();
    });
  });

  test("network error shows offline message", async () => {
    server.use(
      http.get("*/v2/communities/:slug", () => {
        return HttpResponse.error();
      })
    );

    // Verify "network error" or "check connection" message
  });
});
```

---

## Phase 2: Rewrite the Middle Layer (Week 2)

### 2.1 Rewrite Data Component Tests

The 120 "REWRITE" tests currently mock everything. Rewrite them to use MSW handlers and test real data flow:

**Pattern: Before (UNTRUSTED)**
```typescript
jest.mock("@/services/communityGrants.service", () => ({
  getCommunityGrants: jest.fn().mockResolvedValue(mockGrants),
}));

test("shows grants", () => {
  render(<GrantList />);
  expect(screen.getByText("Grant 1")).toBeInTheDocument();
});
// Problem: Tests that your mock returns "Grant 1", not that the component works
```

**Pattern: After (TRUSTED)**
```typescript
test("shows grants from API", async () => {
  // MSW handler returns realistic data
  server.use(...communityHandlers);

  renderWithProviders(<GrantList communitySlug="optimism" />, {
    auth: createAuthenticatedUser(),
  });

  // Verify loading state first
  expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();

  // Verify data renders
  await waitFor(() => {
    expect(screen.getAllByTestId("grant-card")).toHaveLength(10);
  });
});

test("shows error state when API fails", async () => {
  server.use(
    http.get("*/v2/communities/:slug/grants", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    })
  );

  renderWithProviders(<GrantList communitySlug="optimism" />);

  await waitFor(() => {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

test("shows empty state when no grants", async () => {
  server.use(
    http.get("*/v2/communities/:slug/grants", () => {
      return HttpResponse.json({ payload: [], pagination: { total: 0 } });
    })
  );

  renderWithProviders(<GrantList communitySlug="optimism" />);

  await waitFor(() => {
    expect(screen.getByText(/no grants/i)).toBeInTheDocument();
  });
});
```

### 2.2 Priority Components to Rewrite (20 highest-impact)

| Component | What to Test | Current State |
|-----------|-------------|---------------|
| ApplicationForm | Submit flow, validation, draft save | Mocked service |
| ApplicationList | Pagination, filtering, status display | Element existence only |
| MilestoneSubmitForm | Evidence upload, status transition | Not tested |
| PayoutDashboard | Disbursement creation, status tracking | Partially mocked |
| ClaimFundsPage | Eligibility check, claim flow | Not tested |
| CommunityDetail | Stats, programs list, admin actions | CSS assertions |
| ProjectDetail | Grants, milestones, endorsements | CSS assertions |
| ReviewerDashboard | Assigned apps, review actions | Not tested |
| ProgramSettings | Config, reviewers, prompts | Not tested |
| PermissionGate (Can) | Role-based visibility | Mocked context |
| Header/Nav | Auth state, role-based links | Element existence |
| ChainSwitcher | Network detection, switch prompt | Not tested |
| WalletConnect | Connect/disconnect, address display | Globally mocked |
| ErrorBoundary | Catch + display errors | Not tested |
| NotificationToast | Success/error/warning messages | Not tested |
| SearchBar | Query, results, navigation | CSS assertions |
| DataTable | Sort, paginate, filter | CSS assertions |
| FormFields | Validation, error display | Snapshot tests |
| FileUpload | Upload, preview, error | Not tested |
| ConfirmDialog | Destructive action confirmation | Not tested |

---

## Phase 3: E2E That Tests Real Flows (Week 3)

### 3.1 Rewrite Playwright Tests with Real Assertions

**Current state**: 16 Playwright tests that check `expect(body).toBeVisible()`
**Target**: 25 tests that verify actual user flows

**Priority E2E flows (stateless — mocked API, no chain):**

1. **Login → See dashboard** (auth bypass + role verification)
2. **Browse programs → View program detail → Apply** (full applicant journey)
3. **Submit application → See in "My Applications"** (write → read roundtrip)
4. **Reviewer sees assigned apps → Leaves review** (role-restricted flow)
5. **Admin creates disbursement → Sees pending** (payout flow start)
6. **Search → Results → Navigate to result** (search flow)
7. **Switch community → See different data** (multi-tenant)
8. **Error page displayed on 500** (error handling)
9. **Rate limit message on 429** (rate limit handling)
10. **Unauthenticated user cannot access admin pages** (auth guard)

### 3.2 Playwright Fixture Improvements

```typescript
// e2e/fixtures/wallet-mock.ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  // Inject mock wallet before each test
  mockWallet: async ({ page }, use) => {
    await page.addInitScript(() => {
      // Simulate connected wallet state
      window.__TEST_WALLET__ = {
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        chainId: 10, // Optimism
        isConnected: true,
      };
    });
    await use();
  },

  // Login as specific role
  loginAs: async ({ page }, use) => {
    const login = async (role: "applicant" | "reviewer" | "communityAdmin" | "superAdmin") => {
      const roleConfigs = {
        applicant: { primaryRole: "APPLICANT", permissions: ["APPLICATION_SUBMIT"] },
        reviewer: { primaryRole: "PROGRAM_REVIEWER", permissions: ["APPLICATION_REVIEW"] },
        communityAdmin: { primaryRole: "COMMUNITY_ADMIN", permissions: ["*"] },
        superAdmin: { primaryRole: "SUPER_ADMIN", permissions: ["*"] },
      };

      await page.addInitScript((config) => {
        localStorage.setItem("privy:auth_state", JSON.stringify({
          authenticated: true,
          user: { id: `test-${config.primaryRole}` },
        }));
        window.__TEST_PERMISSIONS__ = config;
      }, roleConfigs[role]);
    };
    await use(login);
  },
});
```

---

## Phase 4: RPC Failure Testing (Week 4)

### 4.1 Build Failure Injection Transport

```typescript
// __tests__/fixtures/mocks/rpc-failure-transport.ts
import { custom, type Transport } from "viem";

type FailureMode = "timeout" | "network-error" | "revert" | "nonce-too-low" | "gas-error" | "quota-exceeded";

export function createFailingTransport(failures: Map<string, FailureMode>): Transport {
  return custom({
    async request({ method }) {
      const failure = failures.get(method);
      if (!failure) return; // passthrough

      switch (failure) {
        case "timeout":
          await new Promise((r) => setTimeout(r, 30_000));
          throw new Error("Request timed out");
        case "network-error":
          throw new Error("Failed to fetch");
        case "revert":
          throw new Error("execution reverted");
        case "nonce-too-low":
          throw new Error("nonce too low");
        case "gas-error":
          throw new Error("gas estimation failed");
        case "quota-exceeded":
          throw new Error("relay quota exceeded");
      }
    },
  });
}
```

### 4.2 RPC Failure Tests (8 scenarios)

Test what NO web3 project tests — the unhappy path of blockchain interaction:

1. RPC endpoint unreachable → "Check your connection" message
2. RPC slow (>10s) → Loading indicator, not frozen UI
3. `eth_estimateGas` error → "Transaction may fail" warning
4. `eth_sendTransaction` reverts → "Transaction failed" with reason
5. Transaction stuck (no confirmation) → "Transaction pending" with retry option
6. Nonce too low → "Please try again" (not cryptic error)
7. User rejects signature → "Transaction cancelled" (clean state reset)
8. Gasless relay quota exceeded → "Falling back to regular transaction" or clear error

---

## Success Criteria: What 100/100 Trust Looks Like

After all 4 phases:

| Metric | Before | After |
|--------|--------|-------|
| Test count | 430 | ~250 (fewer but meaningful) |
| CSS assertion tests | 170+ | 0 |
| Tests that catch real bugs | ~30% | ~95% |
| Error state coverage | ~5% | ~90% |
| RBAC boundary tests | Mocked context | Real permission matrix |
| API contract validation | None | MSW handlers match real API |
| Smoke tests | 0 | 10+ (P0 coverage) |
| RPC failure tests | 0 | 8 scenarios |
| Global mocks in setup.js | 50+ | ~10 (polyfills only) |
| Cypress files | 22 | 0 |
| E2E meaningful assertions | ~3 | ~25 |

### The Trust Test

After implementation, ask yourself for each test:

> "If I delete the code this test covers, will this test fail?"

If the answer is "no" → the test is worthless. Delete it.

> "If this test passes, can I ship without manually checking?"

If the answer is "no" → the test needs to be rewritten.

---

## File Structure After Recovery

```
gap-app-v2/
  __tests__/
    fixtures/
      factories/
        auth.factory.ts
        application.factory.ts
        community.factory.ts
        payout.factory.ts
        project.factory.ts
      mocks/
        handlers/
          auth.handler.ts
          applications.handler.ts
          communities.handler.ts
          payouts.handler.ts
          claims.handler.ts
          index.ts                    # Compose all handlers
        rpc-failure-transport.ts      # Phase 4
        wagmi-mock-connector.ts       # Phase 3
      render-with-providers.tsx       # Replaces 50 global mocks
      server.ts                       # MSW server setup
    unit/                             # Pure function tests (KEEP)
    integration/                      # Component + MSW tests (NEW)
      api-error-handling.trust.test.tsx
      application-submit.trust.test.tsx
      payout-flow.trust.test.tsx
      auth-flow.trust.test.tsx
      claim-funds.trust.test.tsx
      permission-enforcement.trust.test.tsx
    setup.ts                          # MINIMAL — polyfills only

  e2e/
    tests/
      auth/                           # Login, logout, session
      applications/                   # Apply, review, approve
      payouts/                        # Disburse, confirm
      claims/                         # Check eligibility, claim
      errors/                         # 401, 403, 429, 500, network
      smoke/                          # Production health checks
    fixtures/
      wallet-mock.ts
      anvil-setup.ts                  # Phase 3+
      chain-helpers.ts

  cypress/                            # DELETED
```
