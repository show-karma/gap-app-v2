# E2E Test Remediation Plan

**Created:** 2024-12-01  
**Status:** Ready for Implementation  
**Priority:** Get all basic tests passing in CI

---

## Executive Summary

The E2E test suite has structural issues preventing reliable execution. This plan addresses:
- Disabled CI pipeline
- Missing authentication infrastructure
- Hardcoded waits causing flakiness
- Empty/stub test implementations
- Test data dependencies

**Decisions Made:**
- ✅ Mock authentication (not Synpress/real wallet)
- ✅ Create test fixtures for data
- ✅ Remove karma-gap-patron test
- ✅ Focus on basic tests passing first
- ✅ Skip visual regression tests (keep infrastructure for later)

---

## Phase 1: CI Integration & Foundation
**Estimated: 1 day**

### 1.1 Create E2E CI Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
  schedule:
    - cron: '0 4 * * *'  # Nightly at 4 AM UTC

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build application
        run: pnpm build
        env:
          NEXT_PUBLIC_PRIVY_APP_ID: ${{ secrets.NEXT_PUBLIC_PRIVY_APP_ID }}

      - name: Run E2E tests
        run: pnpm run e2e:headless
        env:
          NODE_ENV: test
          CYPRESS_BASE_URL: http://localhost:3000

      - name: Upload Cypress screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-screenshots
          path: cypress/screenshots
          retention-days: 7
          if-no-files-found: ignore

      - name: Upload Cypress videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-videos
          path: cypress/videos
          retention-days: 7
          if-no-files-found: ignore
```

### 1.2 Update Cypress Configuration

Update `cypress.config.ts` to add:
- Retry configuration for flaky test mitigation
- Proper timeout defaults
- Video recording settings

```typescript
// Add to cypress.config.ts
{
  retries: {
    runMode: 2,      // Retry failed tests twice in CI
    openMode: 0,     // No retries in interactive mode
  },
  defaultCommandTimeout: 10000,
  pageLoadTimeout: 30000,
  video: true,
  screenshotOnRunFailure: true,
}
```

---

## Phase 2: Authentication Infrastructure
**Estimated: 2 days**

### 2.1 Create Auth Commands

Create `cypress/support/auth-commands.ts`:

```typescript
/**
 * Authentication Commands for E2E Testing
 * Uses mock authentication to simulate logged-in states
 */

export type UserType = 'regular' | 'admin' | 'reviewer' | 'community-admin';

interface MockUser {
  address: string;
  token: string;
  userType: UserType;
}

const MOCK_USERS: Record<UserType, MockUser> = {
  regular: {
    address: '0x1234567890123456789012345678901234567890',
    token: 'mock-token-regular',
    userType: 'regular',
  },
  admin: {
    address: '0xADMIN4567890123456789012345678901234567890',
    token: 'mock-token-admin',
    userType: 'admin',
  },
  reviewer: {
    address: '0xREVIEW567890123456789012345678901234567890',
    token: 'mock-token-reviewer',
    userType: 'reviewer',
  },
  'community-admin': {
    address: '0xCOMMUNITY0123456789012345678901234567890',
    token: 'mock-token-community-admin',
    userType: 'community-admin',
  },
};

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mock login as a specific user type
       * @param options.userType - Type of user to login as
       */
      login(options?: { userType?: UserType }): Chainable<void>;

      /**
       * Logout and clear authentication state
       */
      logout(): Chainable<void>;

      /**
       * Check if user is authenticated
       */
      isAuthenticated(): Chainable<boolean>;
    }
  }
}

Cypress.Commands.add('login', (options = {}) => {
  const { userType = 'regular' } = options;
  const mockUser = MOCK_USERS[userType];

  cy.log(`Logging in as ${userType} user`);

  // Set up localStorage to simulate Privy auth state
  cy.window().then((win) => {
    // Mock Privy authentication state
    const authState = {
      authenticated: true,
      user: {
        id: `did:privy:${mockUser.address}`,
        wallet: {
          address: mockUser.address,
          chainId: 10, // Optimism
        },
      },
      ready: true,
    };

    win.localStorage.setItem('privy:auth_state', JSON.stringify(authState));
    win.localStorage.setItem('privy:token', mockUser.token);
  });

  // Intercept auth-related API calls
  cy.intercept('GET', '**/user/**', (req) => {
    req.reply({
      statusCode: 200,
      body: {
        address: mockUser.address,
        isAdmin: userType === 'admin',
        isReviewer: userType === 'reviewer',
        isCommunityAdmin: userType === 'community-admin',
      },
    });
  }).as('getUser');

  cy.intercept('GET', '**/auth/staff/authorized', (req) => {
    req.reply({
      statusCode: userType === 'admin' ? 200 : 403,
      body: userType === 'admin' 
        ? { authorized: true } 
        : { error: 'Not authorized' },
    });
  }).as('checkStaff');

  // Intercept grantees/communities/admin for community admins
  cy.intercept('GET', '**/grantees/*/communities/admin', (req) => {
    req.reply({
      statusCode: 200,
      body: userType === 'community-admin' ? [{ slug: 'test-community' }] : [],
    });
  }).as('getCommunityAdmin');
});

Cypress.Commands.add('logout', () => {
  cy.log('Logging out');
  
  cy.window().then((win) => {
    win.localStorage.removeItem('privy:auth_state');
    win.localStorage.removeItem('privy:token');
  });

  cy.clearCookies();
});

Cypress.Commands.add('isAuthenticated', () => {
  return cy.window().then((win) => {
    const authState = win.localStorage.getItem('privy:auth_state');
    if (!authState) return false;
    
    try {
      const parsed = JSON.parse(authState);
      return parsed.authenticated === true;
    } catch {
      return false;
    }
  });
});
```

### 2.2 Update Support Entry Point

Update `cypress/support/e2e.ts`:

```typescript
// Import commands
import "./auth-commands";
import "./donation-commands";

// Import image snapshot (keep for future use)
import { addMatchImageSnapshotCommand } from "cypress-image-snapshot/command";

addMatchImageSnapshotCommand({
  customDiffConfig: { threshold: 0.2 },
  failureThreshold: 0.03,
  failureThresholdType: "percent",
  customSnapshotsDir: "cypress/snapshots",
  customDiffDir: "cypress/snapshots/diff",
});

// Test data constants
export const EXAMPLE = {
  COMMUNITY: "gitcoin",
  PROJECT: "scaffold-eth", // Use a known existing project
  FUNDING_MAP: {
    SEARCH_PROGRAM: "optimism",
    NETWORK_FILTER: "Optimism",
  },
  GITCOIN_ROUND_URL: "https://explorer.gitcoin.co/#/round/10/0x...",
};

// Handle uncaught exceptions
Cypress.on("uncaught:exception", (err) => {
  // Ignore locale errors and other non-critical exceptions
  if (err.message.includes("locale") || err.message.includes("hydration")) {
    return false;
  }
  return true;
});

// Clear state before each test
beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});
```

### 2.3 Create Auth Fixtures

Create `cypress/fixtures/auth/regular.json`:
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "projects": [],
  "isAdmin": false,
  "isReviewer": false
}
```

Create `cypress/fixtures/auth/admin.json`:
```json
{
  "address": "0xADMIN4567890123456789012345678901234567890",
  "projects": [],
  "isAdmin": true,
  "isReviewer": false
}
```

---

## Phase 3: Replace Hardcoded Waits
**Estimated: 1.5 days**

### 3.1 Create API Intercept Helpers

Create `cypress/support/intercepts.ts`:

```typescript
/**
 * API Intercept Helpers
 * Replace cy.wait(ms) with proper API intercepts
 */

export const setupCommonIntercepts = () => {
  // Projects
  cy.intercept('GET', '**/projects/**').as('getProjects');
  cy.intercept('GET', '**/projects/list**').as('getProjectsList');
  
  // Communities
  cy.intercept('GET', '**/community/**').as('getCommunity');
  cy.intercept('GET', '**/communities/**').as('getCommunities');
  
  // Grants
  cy.intercept('GET', '**/grants/**').as('getGrants');
  cy.intercept('GET', '**/projects/*/grants').as('getProjectGrants');
  
  // Funding
  cy.intercept('GET', '**/v2/funding-program-configs/**').as('getFundingPrograms');
  
  // Search
  cy.intercept('GET', '**/search**').as('search');
};

export const waitForPageLoad = () => {
  cy.get('body').should('be.visible');
  cy.get('nav').should('exist');
};

export const waitForProjectsLoad = () => {
  cy.wait('@getProjectsList', { timeout: 15000 });
};

export const waitForCommunityLoad = () => {
  cy.wait('@getCommunity', { timeout: 15000 });
};

export const waitForSearchResults = () => {
  cy.wait('@search', { timeout: 10000 });
};
```

### 3.2 Files to Update

| File | Changes Required |
|------|------------------|
| `homepage.cy.ts` | Add intercepts, remove timeout params |
| `projects.cy.ts` | Replace `cy.wait(2000)` with `waitForProjectsLoad()` |
| `project/index.cy.ts` | Replace all `cy.wait(1000)` with intercepts |
| `project/grants.cy.ts` | Add grant intercepts |
| `funding-map/index.cy.ts` | Add funding program intercepts |
| `donation-flow.cy.ts` | Replace `cy.wait(500)` with proper waits |
| `search-journey.cy.ts` | Replace debounce waits with `waitForSearchResults()` |
| `navigation-journey.cy.ts` | Add page transition intercepts |

### 3.3 Example Refactor

**Before:**
```typescript
it("should display projects", () => {
  cy.visit("/projects");
  cy.wait(2000);
  cy.get("body").should("contain.text", "Projects on");
});
```

**After:**
```typescript
import { setupCommonIntercepts, waitForProjectsLoad } from '../support/intercepts';

it("should display projects", () => {
  setupCommonIntercepts();
  cy.visit("/projects");
  waitForProjectsLoad();
  cy.get("h1").should("contain", "Projects on");
});
```

---

## Phase 4: Fix Permission-Based Tests
**Estimated: 1 day**

### 4.1 Update permission-based-access.cy.ts

```typescript
describe("Permission-Based Access", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  describe("Unauthenticated User", () => {
    it("should see Sign in button", () => {
      cy.contains("Sign in").should("be.visible");
    });

    it("should not see user menu", () => {
      cy.get('[data-testid="user-avatar"]').should("not.exist");
    });
  });

  describe("Regular User", () => {
    beforeEach(() => {
      cy.login({ userType: "regular" });
      cy.visit("/");
    });

    it("should see user avatar when logged in", () => {
      cy.get('[data-testid="user-avatar"]').should("be.visible");
    });

    it("should see basic menu items", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("My projects").should("be.visible");
    });

    it("should not see admin link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").should("not.exist");
    });
  });

  describe("Admin User", () => {
    beforeEach(() => {
      cy.login({ userType: "admin" });
      cy.visit("/");
    });

    it("should see admin link in menu", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").should("be.visible");
    });

    it("should navigate to admin page", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Admin").click();
      cy.url().should("include", "/admin");
    });
  });

  describe("Reviewer User", () => {
    beforeEach(() => {
      cy.login({ userType: "reviewer" });
      cy.visit("/");
    });

    it("should see review link", () => {
      cy.get('[data-testid="user-avatar"]').click();
      cy.contains("Review").should("be.visible");
    });
  });
});
```

### 4.2 Update authentication-journey.cy.ts

Uncomment and implement the auth state tests using `cy.login()`.

---

## Phase 5: Test Cleanup
**Estimated: 0.5 days**

### 5.1 Remove Dead Tests

**Delete:** `cypress/e2e/karma-gap-patron.cy.ts`

### 5.2 Skip Visual Regression Tests (Temporary)

Update `cypress/e2e/navbar/visual-regression.cy.ts`:

```typescript
// Skip visual regression tests until baseline images are established
describe.skip("Visual Regression", () => {
  // ... existing tests
});
```

### 5.3 Clean Up Empty Test Shells

Convert any remaining commented tests to proper skips:

```typescript
// Instead of commented code:
it.skip("feature not yet implemented - TODO: implement after auth", () => {});
```

---

## Phase 6: Documentation
**Estimated: 0.5 days**

### 6.1 Create cypress/README.md

```markdown
# E2E Tests

## Quick Start

```bash
# Interactive mode
pnpm e2e

# Headless mode (CI)
pnpm e2e:headless
```

## Prerequisites

1. Development server running on `localhost:3000`
2. Backend indexer running on `localhost:3002`
3. Test data available (gitcoin community with projects)

## Writing Tests

### Authentication

```typescript
// Login as regular user
cy.login();

// Login as admin
cy.login({ userType: 'admin' });

// Logout
cy.logout();
```

### API Intercepts

```typescript
import { setupCommonIntercepts, waitForProjectsLoad } from '../support/intercepts';

it('loads projects', () => {
  setupCommonIntercepts();
  cy.visit('/projects');
  waitForProjectsLoad();
});
```

### Custom Commands

- `cy.login({ userType })` - Mock authentication
- `cy.logout()` - Clear auth state
- `cy.visitCommunity(slug)` - Navigate to community
- `cy.selectToken(symbol)` - Select token in donation flow
- `cy.clearDonationCart()` - Clear cart state

## Troubleshooting

### Tests timing out
- Ensure dev server is running
- Check network intercepts are set up
- Increase timeout in cypress.config.ts

### Auth tests failing
- Clear localStorage before test
- Verify mock user matches expected role
```

---

## Implementation Checklist

### Phase 1: CI Integration
- [ ] Create `.github/workflows/e2e-tests.yml`
- [ ] Update `cypress.config.ts` with retry config
- [ ] Verify workflow runs on PR

### Phase 2: Authentication
- [ ] Create `cypress/support/auth-commands.ts`
- [ ] Update `cypress/support/e2e.ts` imports
- [ ] Create auth fixtures
- [ ] Test login/logout commands manually

### Phase 3: Replace Waits
- [ ] Create `cypress/support/intercepts.ts`
- [ ] Update `homepage.cy.ts`
- [ ] Update `projects.cy.ts`
- [ ] Update `project/index.cy.ts`
- [ ] Update `project/grants.cy.ts`
- [ ] Update `funding-map/index.cy.ts`
- [ ] Update `donation-flow.cy.ts`
- [ ] Update `search-journey.cy.ts`
- [ ] Update `navigation-journey.cy.ts`

### Phase 4: Permission Tests
- [ ] Implement `permission-based-access.cy.ts`
- [ ] Update `authentication-journey.cy.ts`

### Phase 5: Cleanup
- [ ] Delete `karma-gap-patron.cy.ts`
- [ ] Skip visual regression tests
- [ ] Convert commented tests to skips

### Phase 6: Documentation
- [ ] Create `cypress/README.md`
- [ ] Update test data constants

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Tests passing in CI | 0% | 100% |
| `cy.wait(number)` usage | ~40 | 0 |
| Commented assertions | ~50+ | 0 |
| Auth tests implemented | 0 | All |
| CI run time | N/A | < 15 min |

---

## Timeline

```
Day 1: Phase 1 (CI) + Start Phase 2 (Auth)
Day 2: Complete Phase 2 (Auth)
Day 3: Phase 3 (Replace Waits)
Day 4: Phase 4 (Permission Tests) + Phase 5 (Cleanup)
Day 5: Phase 6 (Docs) + Testing & Validation
```

**Total Estimated Time: 5 days**

---

## Notes

- Visual regression tests are skipped, not removed - can be re-enabled once CI is stable
- Mock auth simulates Privy state but doesn't test actual wallet connection
- Test data assumes "gitcoin" community exists with projects
- Run tests against staging environment for realistic data

