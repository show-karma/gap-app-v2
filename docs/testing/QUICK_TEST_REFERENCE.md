# Quick Test Reference Guide

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Specific Test File
```bash
npm test -- donation.test.ts
```

### Specific Test Pattern
```bash
npm test -- --testNamePattern="should validate correct email"
```

## New Test Files (Phase 4)

### Donation Constants
```bash
npm test -- constants/__tests__/donation.test.ts
```

Location: `/constants/__tests__/donation.test.ts`
Tests: 150+ test cases
Coverage: 100% of donation.ts

**What it tests:**
- Donation, balance, network, UX, transaction, and validation constants
- Helper functions: `estimateDonationTime`, `formatEstimatedTime`, `isCartSizeWarning`, `isCartFull`, `getRetryDelay`, `isCacheValid`

### Query Keys
```bash
npm test -- utilities/__tests__/queryKeys.test.ts
```

Location: `/utilities/__tests__/queryKeys.test.ts`
Tests: 80+ test cases
Coverage: 100% of queryKeys.ts

**What it tests:**
- React Query key generators for milestones, applications, reviewers, contracts, community, and grants
- Tuple structure validation
- Parameter handling

### Funding Applications Service
```bash
npm test -- services/__tests__/funding-applications.test.ts
```

Location: `/services/__tests__/funding-applications.test.ts`
Tests: 30+ test cases
Coverage: 100% of funding-applications.ts

**What it tests:**
- `fetchApplicationByProjectUID()` function
- `deleteApplication()` function
- Error handling and logging

## Coverage Commands

### View Coverage Summary
```bash
npm run test:coverage | grep "All files"
```

### View Specific File Coverage
```bash
npm run test:coverage | grep "donation.ts"
```

### Open Coverage Report in Browser
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Test Writing Commands

### Create New Test File
```bash
touch <path>/__tests__/<filename>.test.ts
```

Example:
```bash
touch components/__tests__/Button.test.tsx
```

### Run Only New Tests
```bash
npm test -- --testPathPattern="<pattern>"
```

Example:
```bash
npm test -- --testPathPattern="donation|queryKeys|funding-applications"
```

## Debugging Tests

### Run Single Test with Debug Info
```bash
npm test -- --runInBand --verbose <test-file>
```

### Run with Console Logs
```bash
npm test -- --silent=false <test-file>
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand <test-file>
```

## Coverage Thresholds

Current thresholds (defined in `jest.config.js`):

```javascript
coverageThreshold: {
  global: {
    functions: 50,  // ✅ ACHIEVED: 52.53%
    statements: 90, // ✅ ACHIEVED: 91.32%
    branches: 80,   // ✅ ACHIEVED: 87.78%
  }
}
```

## Common Test Patterns

### Unit Test Template
```typescript
import { functionName } from '../module';

describe('functionName', () => {
  it('should handle happy path', () => {
    const result = functionName(validInput);
    expect(result).toBe(expectedOutput);
  });

  it('should handle edge cases', () => {
    expect(functionName(null)).toBe(null);
    expect(functionName(undefined)).toBe(undefined);
  });

  it('should throw on invalid input', () => {
    expect(() => functionName(invalidInput)).toThrow();
  });
});
```

### Component Test Template
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interactions', () => {
    const handleClick = jest.fn();
    render(<Component onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Service Test Template
```typescript
import { serviceName } from '../service';
import { mockApiClient } from '@/test-utils/mocks';

jest.mock('@/utilities/api-client');

describe('serviceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call API successfully', async () => {
    mockApiClient.get.mockResolvedValue({ data: mockData });

    const result = await serviceName(params);

    expect(result).toEqual(mockData);
    expect(mockApiClient.get).toHaveBeenCalledWith(expectedEndpoint);
  });

  it('should handle errors', async () => {
    mockApiClient.get.mockRejectedValue(new Error('API Error'));

    await expect(serviceName(params)).rejects.toThrow('API Error');
  });
});
```

## Useful npm Scripts

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Fast mode (unit tests, single worker)
npm run test:fast

# Debug mode
npm run test:debug

# E2E tests (Cypress)
npm run e2e

# E2E headless
npm run e2e:headless
```

## Coverage Goals

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Functions | 52.53% | 50% | ✅ Exceeded |
| Statements | 91.32% | 90% | ✅ Met |
| Branches | 87.78% | 80% | ✅ Met |

## Tips

1. **Run tests before committing:**
   ```bash
   npm test
   ```

2. **Check coverage after adding tests:**
   ```bash
   npm run test:coverage
   ```

3. **Use watch mode during development:**
   ```bash
   npm run test:watch
   ```

4. **Focus on specific test files:**
   ```bash
   npm test -- <filename>
   ```

5. **Update snapshots if needed:**
   ```bash
   npm test -- -u
   ```

## Troubleshooting

### Tests Failing After Update
```bash
# Clear Jest cache
npm test -- --clearCache

# Re-run tests
npm test
```

### Coverage Not Updating
```bash
# Remove coverage directory
rm -rf coverage/

# Run coverage again
npm run test:coverage
```

### Out of Memory Errors
```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

### Slow Tests
```bash
# Run with fewer workers
npm test -- --maxWorkers=2

# Or use fast mode
npm run test:fast
```

## Documentation

For more detailed information, see:
- `/docs/testing/PHASE_4_COMPLETION_SUMMARY.md` - Achievement summary
- `/docs/testing/PHASE_4_IMPLEMENTATION_GUIDE.md` - Storybook, Chromatic, Lighthouse CI setup
- `/docs/testing/testing-strategy.md` - Overall testing strategy

## Quick Links

- Jest Documentation: https://jestjs.io/
- Testing Library: https://testing-library.com/
- React Testing Library: https://testing-library.com/react
- Coverage Report: `/coverage/lcov-report/index.html` (after running `npm run test:coverage`)
