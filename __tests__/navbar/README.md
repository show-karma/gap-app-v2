# Navbar Test Infrastructure

This directory contains the complete test infrastructure for the navbar component system in gap-app-v2.

## 📁 Directory Structure

```
__tests__/navbar/
├── fixtures/              # Test data and scenarios
│   ├── auth-fixtures.ts   # Authentication & permission scenarios (15+ combinations)
│   └── search-fixtures.ts # Search response data and scenarios
├── mocks/                 # API mocking with MSW
│   └── handlers.ts        # Request handlers for all API endpoints
├── utils/                 # Test utilities and helpers
│   └── test-helpers.tsx   # Custom render functions, mocks, and utilities
├── setup.ts               # Global test configuration
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

The test infrastructure uses:
- **Jest** - Test runner
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker)** - API mocking
- **jest-axe** - Accessibility testing
- **@testing-library/user-event** - User interaction simulation

### Installation

All dependencies are already included in the project's `package.json`. No additional installation needed.

### Running Tests

```bash
# Run all navbar tests
pnpm test __tests__/navbar

# Run with coverage
pnpm test:coverage __tests__/navbar

# Watch mode
pnpm test:watch __tests__/navbar

# Run specific test file
pnpm test __tests__/navbar/unit/navbar.test.tsx
```

## 📦 Fixtures

### Auth Fixtures (`fixtures/auth-fixtures.ts`)

Provides 15+ authentication and permission scenarios covering all possible user states:

```typescript
import { authFixtures, getAuthFixture } from './fixtures/auth-fixtures';

// Get a specific fixture
const adminUser = getAuthFixture('community-admin-single');

// Use in tests
const { authState, permissions, expectedElements } = adminUser;
```

**Available Fixtures:**
1. `unauthenticated` - Not logged in
2. `authenticated-basic` - Basic user with no permissions
3. `community-admin-single` - Admin of 1 community
4. `community-admin-multiple` - Admin of multiple communities
5. `reviewer-single` - Reviewer for 1 program
6. `reviewer-multiple` - Reviewer for multiple programs
7. `staff` - Staff member with admin access
8. `owner` - Platform owner
9. `pool-manager` - Registry pool manager
10. `registry-admin` - Registry administrator
11. `admin-and-reviewer` - Community admin + reviewer
12. `staff-and-reviewer` - Staff + reviewer
13. `registry-admin-and-community-admin` - Combined registry & community admin
14. `super-user` - All permissions
15. `loading` - Loading state (ready = false)

### Search Fixtures (`fixtures/search-fixtures.ts`)

Provides mock search data for various scenarios:

```typescript
import {
  emptySearchResults,
  projectsOnlyResults,
  mixedResults,
  searchQueries,
  getResultsByQuery
} from './fixtures/search-fixtures';

// Use predefined results
const results = mixedResults;

// Or generate results based on query
const results = getResultsByQuery('optimism');
```

**Available Data:**
- `emptySearchResults` - No results
- `projectsOnlyResults` - Only projects (3 items)
- `communitiesOnlyResults` - Only communities (2 items)
- `mixedResults` - Projects + communities
- `largeResultSet` - 50 projects + 30 communities (performance testing)
- `groupedCommunitiesResults` - Communities with similar names
- `searchQueries` - Pre-defined search strings
- `searchResponseScenarios` - API response scenarios (success, errors, timeout)

## 🛠 Test Helpers

### Custom Render Function

Use `renderWithProviders` to render components with all necessary providers:

```typescript
import { renderWithProviders } from './utils/test-helpers';
import { getAuthFixture } from './fixtures/auth-fixtures';
import { Navbar } from '@/src/components/navbar/navbar';

const fixture = getAuthFixture('authenticated-basic');

const { getByText, queryByText } = renderWithProviders(
  <Navbar />,
  {
    authState: fixture.authState,
    permissions: fixture.permissions,
    theme: 'light'
  }
);
```

### Mock Creation Helpers

```typescript
import {
  createMockUseAuth,
  createMockUseTheme,
  setupAuthMocks
} from './utils/test-helpers';

// Create individual mocks
const mockAuth = createMockUseAuth(authState);

// Or setup all mocks at once
setupAuthMocks(authState, permissions);
```

### Viewport Simulation

```typescript
import { setViewport, viewports } from './utils/test-helpers';

// Set to mobile viewport
setViewport('mobile'); // 375x667

// Or use specific dimensions
const { mobile, tablet, desktop, wide } = viewports;
```

### Utility Functions

```typescript
import {
  waitForDebounce,
  simulateClickOutside,
  formatAddress,
  createMockModalButton
} from './utils/test-helpers';

// Wait for debounce (500ms default)
await waitForDebounce();

// Simulate clicking outside an element
simulateClickOutside(dropdownElement);

// Format wallet address
const formatted = formatAddress('0x1234...5678'); // "0x1234...5678"

// Create mock DOM elements
const button = createMockModalButton('new-project-button');
```

## 🌐 MSW Handlers

### Using Default Handlers

The setup file automatically configures MSW with default handlers. They're used in all tests.

### Override Handlers for Specific Tests

```typescript
import { server } from './setup';
import { scenarioHandlers } from './mocks/handlers';

test('search returns empty results', async () => {
  // Override for this test only
  server.use(scenarioHandlers.emptySearch);
  
  // Your test code here
});
```

### Available Scenario Handlers

```typescript
import { scenarioHandlers } from './mocks/handlers';

// Use specific scenarios
scenarioHandlers.emptySearch      // Empty results
scenarioHandlers.projectsOnly     // Only projects
scenarioHandlers.communitiesOnly  // Only communities
scenarioHandlers.largeResults     // Large result set
scenarioHandlers.error404         // 404 error
scenarioHandlers.error500         // 500 error
scenarioHandlers.timeout          // Network timeout
```

### Custom Handlers

```typescript
import { createCustomSearchHandler } from './mocks/handlers';

const customHandler = createCustomSearchHandler(
  { data: { projects: [], communities: [] } },
  200 // delay in ms
);

server.use(customHandler);
```

## 🔧 Setup Configuration

The `setup.ts` file configures:

1. **MSW Server** - Automatic API mocking
2. **Global Mocks** - window.matchMedia, IntersectionObserver, ResizeObserver
3. **Next.js Mocks** - next/image, next/link, next/navigation
4. **Auth Mocks** - Privy, Wagmi hooks
5. **Accessibility** - jest-axe matchers
6. **Environment Variables** - Test-specific env vars

### Using Fake Timers

For testing debounced functions:

```typescript
import { setupFakeTimers, advanceTimersByTime, cleanupFakeTimers } from './setup';

beforeEach(() => {
  setupFakeTimers();
});

afterEach(() => {
  cleanupFakeTimers();
});

test('search debounces input', () => {
  // Type in search
  fireEvent.change(input, { target: { value: 'test' } });
  
  // Advance timers by debounce delay
  advanceTimersByTime(500);
  
  // Now the API call should have been made
  expect(mockApiCall).toHaveBeenCalled();
});
```

## 📝 Writing Tests

### Basic Test Structure

```typescript
import { renderWithProviders, screen, waitFor } from '../utils/test-helpers';
import { getAuthFixture } from '../fixtures/auth-fixtures';
import { Navbar } from '@/src/components/navbar/navbar';

describe('Navbar', () => {
  it('renders correctly for authenticated user', () => {
    const fixture = getAuthFixture('authenticated-basic');
    
    renderWithProviders(<Navbar />, {
      authState: fixture.authState,
      permissions: fixture.permissions
    });
    
    expect(screen.getByText('My projects')).toBeInTheDocument();
  });
});
```

### Testing with MSW

```typescript
import { server } from '../setup';
import { scenarioHandlers } from '../mocks/handlers';

test('handles search API error', async () => {
  // Override handler for this test
  server.use(scenarioHandlers.error500);
  
  renderWithProviders(<NavbarSearch />);
  
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value: 'test' } });
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Testing Different Permission States

```typescript
import { authFixtures } from '../fixtures/auth-fixtures';

describe('Permission-based visibility', () => {
  authFixtures.forEach(fixture => {
    it(`shows correct elements for ${fixture.name}`, () => {
      renderWithProviders(<Navbar />, {
        authState: fixture.authState,
        permissions: fixture.permissions
      });
      
      const { expectedElements } = fixture;
      
      if (expectedElements.admin) {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Admin')).not.toBeInTheDocument();
      }
    });
  });
});
```

### Accessibility Testing

```typescript
import { axe } from 'jest-axe';

test('has no accessibility violations', async () => {
  const { container } = renderWithProviders(<Navbar />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 🎯 Best Practices

### 1. Use Fixtures for Consistency

Always use fixtures instead of creating ad-hoc test data:

```typescript
// ❌ Bad
const authState = { ready: true, authenticated: true };

// ✅ Good
const fixture = getAuthFixture('authenticated-basic');
const authState = fixture.authState;
```

### 2. Use renderWithProviders

Always render components with the custom render function:

```typescript
// ❌ Bad
render(<Navbar />);

// ✅ Good
renderWithProviders(<Navbar />, { authState, permissions });
```

### 3. Clean Up After Tests

The setup file handles most cleanup, but for custom mocks:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 4. Test User Interactions

Use `@testing-library/user-event` for realistic interactions:

```typescript
import { userEvent } from '../utils/test-helpers';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'search query');
```

### 5. Wait for Async Operations

Always wait for async operations to complete:

```typescript
import { waitFor } from '../utils/test-helpers';

await waitFor(() => {
  expect(screen.getByText('Results')).toBeInTheDocument();
});
```

## 🐛 Troubleshooting

### MSW Not Intercepting Requests

1. Ensure `server.listen()` is called in `beforeAll`
2. Check that the API URL matches the handler URL
3. Verify `server.resetHandlers()` is called in `afterEach`

### Timers Not Working

1. Use `setupFakeTimers()` before the test
2. Use `advanceTimersByTime()` to advance time
3. Use `cleanupFakeTimers()` after the test

### Component Not Updating

1. Wrap state changes in `act()`
2. Use `waitFor()` for async updates
3. Check that providers are properly set up

### Auth State Not Reflecting

1. Verify mocks are set up before rendering
2. Check that `ready` is `true` in auth state
3. Ensure all required stores are mocked

## 📚 Additional Resources

- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [Navbar Testing Plan](../../../docs/testing/navbar-testing-plan.md)

## 🤝 Contributing

When adding new navbar features:

1. **Add fixtures** if new permission states are introduced
2. **Add handlers** if new API endpoints are used
3. **Add utilities** if new test patterns emerge
4. **Update this README** with new examples
5. **Document test scenarios** in the main testing plan

## 📋 Checklist for New Tests

- [ ] Import fixtures instead of creating inline data
- [ ] Use `renderWithProviders` with proper options
- [ ] Setup MSW handlers if testing API calls
- [ ] Use fake timers for debounced functions
- [ ] Test all permission states if applicable
- [ ] Test responsive behavior (mobile/desktop)
- [ ] Test accessibility with jest-axe
- [ ] Clean up mocks and timers
- [ ] Add descriptive test names
- [ ] Group related tests with `describe`

---

**Phase 1: Foundation & Test Infrastructure** ✅ Complete

Ready for Phase 2: Unit Tests

