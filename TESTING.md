# Testing Guide

This document provides guidelines and best practices for writing and running tests in the gap-app-v2 project.

## Table of Contents

- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Utilities](#test-utilities)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Known Issues](#known-issues)

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run only unit tests (hooks, stores, utilities, services)
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Debug tests (sequential, detect open handles, log heap usage)
pnpm test:debug
```

---

## Running Tests

### Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `pnpm test` | Run all tests with optimized settings | CI/CD, full test suite |
| `pnpm test:watch` | Run tests in watch mode | Development |
| `pnpm test:coverage` | Run tests with coverage report | Quality checks |
| `pnpm test:unit` | Run only unit tests | Fast feedback loop |
| `pnpm test:integration` | Run only integration tests | E2E verification |
| `pnpm test:debug` | Run with debugging flags | Troubleshooting |

### Test Configuration

Tests are configured in `jest.config.ts`:

- **Test Environment**: `jsdom` (for React component testing)
- **Coverage**: Disabled by default (use `--coverage` flag to enable)
- **Max Workers**: 50% of CPU cores (prevents memory exhaustion)
- **Timeout**: 30 seconds per test
- **Transform**: ESM modules (wagmi, viem, @privy-io) are transformed

### Memory Configuration

All test scripts include `NODE_OPTIONS=--max-old-space-size=4096` to prevent out-of-memory errors when running the full suite.

---

## Writing Tests

### Test File Naming

- Unit tests: `<filename>.test.ts` or `<filename>.test.tsx`
- Integration tests: `<feature>.integration.test.ts`
- Test files should be colocated with the code they test:
  - `hooks/__tests__/`
  - `store/__tests__/`
  - `utilities/__tests__/`
  - `services/__tests__/`
  - `__tests__/` (for pages and components)

### Basic Test Structure

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { myHook } from "../myHook";

describe("myHook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should do something", () => {
    const { result } = renderHook(() => myHook());

    expect(result.current.value).toBe(expectedValue);
  });
});
```

### Testing React Hooks

Use the test utilities for consistent provider setup:

```typescript
import { renderHook } from "@testing-library/react";
import { createQueryClientWrapper } from "@/__tests__/utils/testProviders";
import { useMyHook } from "../useMyHook";

describe("useMyHook", () => {
  it("should fetch data", async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createQueryClientWrapper()
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### Testing Components

```typescript
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);

    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

---

## Test Utilities

### Available Utilities

#### 1. Test Providers (`__tests__/utils/testProviders.tsx`)

```typescript
import { createQueryClientWrapper, withTestProviders } from "@/__tests__/utils/testProviders";

// For hooks
const { result } = renderHook(() => useMyHook(), {
  wrapper: createQueryClientWrapper()
});

// For components
render(withTestProviders(<MyComponent />));
```

#### 2. Mock Data (`__tests__/utils/mockData.ts`)

```typescript
import {
  MOCK_ADDRESSES,
  MOCK_TOKENS,
  MOCK_CART_ITEMS,
  createMockProject,
  createMockPayment
} from "@/__tests__/utils/mockData";

// Use predefined mocks
const mockToken = MOCK_TOKENS.USDC_OPTIMISM;
const mockAddress = MOCK_ADDRESSES.VALID_WALLET;

// Create custom mocks
const project = createMockProject({ title: "Custom Title" });
```

### Global Mocks

The following are mocked globally in `tests/setup.js`:

- **Next.js Navigation**: `useRouter`, `usePathname`, `useSearchParams`, `useParams`
- **Privy Authentication**: `usePrivy`, `useWallets`, `useLogin`, `useLogout`
- **Wagmi**: `useAccount`, `useBalance`, `useConnect`, `useSwitchChain`
- **Sentry**: `captureException`, `captureMessage`
- **Browser APIs**: `matchMedia`, `IntersectionObserver`, `ResizeObserver`

---

## Common Patterns

### 1. Mocking API Calls

```typescript
jest.mock("@/utilities/gapIndexerApi", () => ({
  gapIndexerApi: {
    projectBySlug: jest.fn().mockResolvedValue({ data: mockProject }),
  },
}));
```

### 2. Mocking Authentication

```typescript
import { TokenManager } from "@/utilities/auth/token-manager";

jest.mock("@/utilities/auth/token-manager");

beforeEach(() => {
  (TokenManager.getToken as jest.Mock).mockResolvedValue("mock-token");
});
```

### 3. Testing Async State Updates

```typescript
import { renderHook, waitFor } from "@testing-library/react";

it("should update async state", async () => {
  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

### 4. Testing Error States

```typescript
it("should handle errors", async () => {
  const mockError = new Error("Test error");
  mockApiCall.mockRejectedValue(mockError);

  const { result } = renderHook(() => useMyHook());

  await waitFor(() => {
    expect(result.current.error).toBeDefined();
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Out of Memory Errors

**Symptom**: Tests crash with "JavaScript heap out of memory"

**Solution**:
- Memory limits are already set in package.json scripts
- Run `pnpm test:unit` to test smaller subsets
- Check for memory leaks in your code (use `pnpm test:debug`)

#### 2. Tests Hanging

**Symptom**: Tests don't complete, no output

**Solution**:
- Use `pnpm test:debug --detectOpenHandles` to find what's keeping tests alive
- Ensure all async operations are properly cleaned up
- Add timeouts to waitFor calls:
  ```typescript
  await waitFor(() => {
    expect(condition).toBe(true);
  }, { timeout: 5000 });
  ```

#### 3. Act Warnings

**Symptom**: "Warning: An update to Component was not wrapped in act(...)"

**Solution**:
```typescript
import { act } from "@testing-library/react";

act(() => {
  result.current.updateState(newValue);
});
```

#### 4. Module Resolution Errors

**Symptom**: "Cannot find module '@/...'"

**Solution**:
- Check `moduleNameMapper` in `jest.config.ts`
- Ensure the path alias is defined in both `tsconfig.json` and `jest.config.ts`

---

## Known Issues

### Skipped Tests

Some tests are currently skipped due to known issues:

1. **usePayoutAddressManager** (entire suite)
   - **Issue**: Infinite loop bug in hook implementation
   - **Error**: "Maximum update depth exceeded"
   - **Location**: `hooks/donation/usePayoutAddressManager.ts:63`
   - **Fix Required**: Hook implementation needs refactoring

2. **useCrossChainBalances** error handling tests
   - **Issue**: React Query's retry behavior is difficult to test reliably
   - **Tests Skipped**:
     - "should handle RPC errors gracefully"
     - "should support manual retry"
   - **Note**: Core functionality is tested, only edge cases are skipped

### Failing Tests (To Be Fixed)

The following test suites still have failures:

1. **services/__tests__/application-comments.service.test.ts**
   - Authentication header expectations

2. **services/__tests__/application-comments-integration.test.ts**
   - Authentication flow tests

3. **__tests__/components/FundingPlatform/ApplicationList/ApplicationList.aiScore.test.tsx**
   - AI Score column rendering

---

## Best Practices

### DO ✅

- ✅ Use descriptive test names: `"should fetch user data when authenticated"`
- ✅ Test behavior, not implementation details
- ✅ Use centralized mock data from `__tests__/utils/mockData.ts`
- ✅ Clean up after tests (clear mocks, reset state)
- ✅ Use `waitFor` for async assertions
- ✅ Group related tests with `describe` blocks
- ✅ Add comments explaining complex test setup

### DON'T ❌

- ❌ Don't test third-party library internals (e.g., react-query retry behavior)
- ❌ Don't use real API calls in unit tests
- ❌ Don't forget to mock authentication (Token Manager, Privy)
- ❌ Don't commit tests with `.only` or `.skip` without documentation
- ❌ Don't duplicate mock data across test files
- ❌ Don't test implementation details (internal state, private methods)

---

## Coverage Goals

Current coverage status:
- **Unit Tests**: Hooks, stores, utilities, services
- **Integration Tests**: End-to-end flows
- **Component Tests**: Selected critical components

Coverage thresholds can be enabled in `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

---

## Contributing

When adding new tests:

1. Follow the existing patterns in similar test files
2. Use the test utilities in `__tests__/utils/`
3. Document any new mocks or patterns
4. Ensure tests pass locally before pushing
5. Update this guide if you discover new patterns or solutions

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
