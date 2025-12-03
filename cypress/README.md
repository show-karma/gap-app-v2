# E2E Tests - gap-app-v2

End-to-end tests using Cypress for the GAP frontend application.

## Quick Start

```bash
# Interactive mode (opens Cypress UI)
pnpm e2e

# Headless mode (CI)
pnpm e2e:headless

# Open Cypress directly
pnpm cypress:open
```

## Prerequisites

1. **Development server** running on `localhost:3000`
   ```bash
   pnpm dev
   ```

2. **Backend indexer** running on `localhost:3002` (for API calls)
   ```bash
   cd ../gap-indexer && yarn dev
   ```

3. **Test data** available (gitcoin community with projects)

## Project Structure

```
cypress/
├── e2e/                    # Test files
│   ├── donation/           # Donation flow tests
│   │   ├── donation-flow.cy.ts
│   │   ├── cross-chain-donation.cy.ts
│   │   └── error-handling.cy.ts
│   ├── navbar/             # Navigation tests
│   │   ├── navigation-journey.cy.ts
│   │   ├── authentication-journey.cy.ts
│   │   ├── permission-based-access.cy.ts
│   │   ├── search-journey.cy.ts
│   │   ├── mobile-navigation.cy.ts
│   │   └── visual-regression.cy.ts
│   ├── project/            # Project page tests
│   │   ├── index.cy.ts
│   │   └── grants.cy.ts
│   ├── funding-map/        # Funding map tests
│   │   └── index.cy.ts
│   ├── homepage.cy.ts
│   └── projects.cy.ts
├── fixtures/               # Test data
│   └── auth/               # Auth mock data
├── support/                # Custom commands and utilities
│   ├── auth-commands.ts    # Login/logout commands
│   ├── donation-commands.ts# Donation helpers
│   ├── intercepts.ts       # API intercept helpers
│   └── e2e.ts              # Main support file
└── snapshots/              # Visual regression baselines
```

## Writing Tests

### Authentication

Mock authentication is used for testing. Use the `cy.login()` command:

```typescript
// Login as regular user
cy.login();

// Login as specific user type
cy.login({ userType: "admin" });
cy.login({ userType: "reviewer" });
cy.login({ userType: "community-admin" });

// Logout
cy.logout();
```

### API Intercepts

Replace `cy.wait(ms)` with proper API intercepts:

```typescript
import {
  setupCommonIntercepts,
  waitForProjectsLoad,
  waitForPageLoad,
} from "../support/intercepts";

describe("My Test", () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it("loads projects", () => {
    cy.visit("/projects");
    waitForProjectsLoad();
    cy.get('[id^="project-card"]').should("exist");
  });
});
```

### Custom Commands

| Command | Description |
|---------|-------------|
| `cy.login({ userType })` | Mock authentication |
| `cy.logout()` | Clear auth state |
| `cy.visitCommunity(slug)` | Navigate to community page |
| `cy.visitDonationCheckout(community, programId)` | Navigate to checkout |
| `cy.selectToken(symbol)` | Select token in donation flow |
| `cy.clearDonationCart()` | Clear cart localStorage |
| `cy.setupCommonIntercepts()` | Set up API intercepts |

### Test Data Constants

```typescript
import { EXAMPLE } from "../support/e2e";

// Available constants:
EXAMPLE.COMMUNITY        // "gitcoin"
EXAMPLE.PROJECT          // "scaffold-eth"
EXAMPLE.FUNDING_MAP.SEARCH_PROGRAM  // "optimism"
```

## Best Practices

### DO ✅

```typescript
// Use intercepts instead of arbitrary waits
setupCommonIntercepts();
cy.visit("/projects");
waitForProjectsLoad();

// Use data-testid for stable selectors
cy.get('[data-testid="cart-button"]').click();

// Use descriptive test names
it("should display error when amount exceeds balance", () => {});

// Group related tests
describe("Cart Operations", () => {
  it("should add item to cart", () => {});
  it("should remove item from cart", () => {});
});
```

### DON'T ❌

```typescript
// Avoid arbitrary waits
cy.wait(2000);  // ❌

// Avoid brittle selectors
cy.get(".btn-primary").click();  // ❌

// Avoid vague test names
it("works", () => {});  // ❌
```

## Troubleshooting

### Tests timing out

1. Ensure dev server is running on port 3000
2. Ensure backend is running on port 3002
3. Check if intercepts are set up correctly
4. Increase timeout in `cypress.config.ts` if needed

### Auth tests failing

1. Clear localStorage before test: `cy.clearLocalStorage()`
2. Verify mock user matches expected role
3. Check if API intercepts are returning correct data

### Flaky tests

1. Replace `cy.wait(ms)` with proper intercepts
2. Use `cy.get().should()` assertions that retry
3. Add retries in `cypress.config.ts`:
   ```typescript
   retries: {
     runMode: 2,
     openMode: 0,
   }
   ```

### Visual regression failures

Visual regression tests are currently **skipped**. To enable:
1. Run tests once to generate baseline snapshots
2. Review and commit snapshots to `cypress/snapshots/`
3. Remove `.skip()` from `visual-regression.cy.ts`

## CI Integration

E2E tests run automatically on:
- Pull requests (all branches)
- Nightly builds (4 AM UTC)
- Manual trigger via workflow_dispatch

Artifacts uploaded on failure:
- Screenshots: `cypress/screenshots`
- Videos: `cypress/videos`

## Available Scripts

```bash
pnpm e2e              # Interactive E2E
pnpm e2e:headless     # Headless E2E (CI)
pnpm cypress:open     # Open Cypress UI
pnpm component        # Component tests (interactive)
pnpm component:headless # Component tests (CI)
```

## Configuration

- **cypress.config.ts** - Main configuration
- **cypress/support/e2e.ts** - Test setup and globals
- **cypress.env.json** - Environment variables (not committed)

## Related Documentation

- [Testing Strategy](../docs/testing/testing-strategy.md)
- [E2E Remediation Plan](../docs/E2E_TEST_REMEDIATION_PLAN.md)
- [Cypress Documentation](https://docs.cypress.io/)

