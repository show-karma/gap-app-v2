# Test Review Checklist

This checklist ensures test quality and maintainability during PR reviews and regular test audits.

## For PR Reviewers

Use this checklist when reviewing pull requests that include tests.

### Test Coverage

- [ ] All new features have corresponding tests
- [ ] Coverage meets or exceeds minimum threshold (50%)
- [ ] Critical paths are well-tested
- [ ] Edge cases are covered
- [ ] Error scenarios are tested

### Test Quality

- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Test names are descriptive and explain the scenario
- [ ] Tests are isolated and don't depend on execution order
- [ ] Tests don't have unnecessary duplication
- [ ] Mocks and stubs are used appropriately
- [ ] Tests are deterministic (no random values, proper async handling)

### Test Organization

- [ ] Tests are in the correct location (`__tests__/` directory)
- [ ] Test files follow naming convention (`*.test.ts` or `*.test.tsx`)
- [ ] Related tests are grouped in describe blocks
- [ ] Test utilities are reused when appropriate
- [ ] Setup and teardown are handled correctly

### Performance

- [ ] Tests run quickly (< 5 seconds per test file ideal)
- [ ] No unnecessary delays or timeouts
- [ ] Async operations are properly handled with `waitFor`
- [ ] External dependencies are mocked

### Skipped Tests

- [ ] No new skipped tests without explanation
- [ ] Existing skipped tests have tracking tickets
- [ ] Skipped tests include TODO comments explaining why

### Web3-Specific Checks

- [ ] Wallet connections are properly mocked
- [ ] Smart contract interactions use MSW or mocked providers
- [ ] Attestation data is properly structured
- [ ] Blockchain addresses are valid test addresses
- [ ] Gas estimation calls are mocked

## Test Quality Score

Rate each test file on a scale of 1-5:

1. **Coverage** (Are all code paths tested?)
2. **Clarity** (Are tests easy to understand?)
3. **Maintainability** (Will tests be easy to update?)
4. **Performance** (Do tests run quickly?)
5. **Reliability** (Are tests consistently passing?)

**Target: 4+ average across all categories**

## Common Test Smells to Avoid

### 1. Testing Implementation Details

Bad:
```typescript
expect(component.state.isOpen).toBe(true);
```

Good:
```typescript
expect(screen.getByRole('dialog')).toBeVisible();
```

### 2. Over-Mocking

Bad:
```typescript
jest.mock('@/components/Button');
jest.mock('@/components/Input');
jest.mock('@/components/Form');
// Testing empty shells
```

Good:
```typescript
// Mock only external dependencies
jest.mock('wagmi');
```

### 3. Fragile Selectors

Bad:
```typescript
const button = container.querySelector('.button-class > div > span');
```

Good:
```typescript
const button = screen.getByRole('button', { name: /submit/i });
```

### 4. Unclear Test Names

Bad:
```typescript
it('test 1', () => {});
it('works', () => {});
it('should test the component', () => {});
```

Good:
```typescript
it('should display error message when email is invalid', () => {});
it('should disable submit button while form is submitting', () => {});
```

### 5. Not Testing User Interactions

Bad:
```typescript
component.handleClick();
expect(component.state.clicked).toBe(true);
```

Good:
```typescript
fireEvent.click(screen.getByRole('button'));
expect(screen.getByText('Success!')).toBeInTheDocument();
```

### 6. Excessive Setup

Bad:
```typescript
it('should work', () => {
  // 50 lines of setup
  const result = functionUnderTest();
  expect(result).toBe(expected);
});
```

Good:
```typescript
// Shared setup in beforeEach or test helpers
beforeEach(() => {
  setupTestData();
});

it('should calculate total correctly', () => {
  const result = calculateTotal();
  expect(result).toBe(100);
});
```

## Flaky Test Identification

Signs a test might be flaky:

- [ ] Uses `setTimeout` or arbitrary delays
- [ ] Depends on external services without proper mocking
- [ ] Has random data generation without seeding
- [ ] Fails intermittently in CI but passes locally
- [ ] Depends on test execution order
- [ ] Has race conditions in async operations
- [ ] Uses date/time without mocking
- [ ] Depends on network conditions

## Fixing Flaky Tests

### Strategy 1: Proper Async Handling

Bad:
```typescript
it('should load data', async () => {
  render(<Component />);
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

Good:
```typescript
it('should load data', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Strategy 2: Mock Time

Bad:
```typescript
it('should show timestamp', () => {
  render(<Component />);
  expect(screen.getByText('2024-01-01')).toBeInTheDocument(); // Fails tomorrow
});
```

Good:
```typescript
it('should show timestamp', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01'));

  render(<Component />);
  expect(screen.getByText('2024-01-01')).toBeInTheDocument();

  jest.useRealTimers();
});
```

### Strategy 3: Deterministic Data

Bad:
```typescript
it('should sort items', () => {
  const items = [Math.random(), Math.random(), Math.random()];
  const sorted = sortItems(items);
  expect(sorted[0]).toBeLessThan(sorted[1]);
});
```

Good:
```typescript
it('should sort items in ascending order', () => {
  const items = [3, 1, 2];
  const sorted = sortItems(items);
  expect(sorted).toEqual([1, 2, 3]);
});
```

### Strategy 4: Wait for Stability

Bad:
```typescript
it('should animate', () => {
  render(<AnimatedComponent />);
  expect(component.style.opacity).toBe('1'); // Might still be animating
});
```

Good:
```typescript
it('should complete animation', async () => {
  render(<AnimatedComponent />);
  await waitFor(() => {
    expect(screen.getByTestId('animated')).toHaveStyle({ opacity: '1' });
  });
});
```

## Test Maintenance Schedule

### Weekly Reviews

- [ ] Review all skipped tests
- [ ] Check test execution time trends
- [ ] Identify and fix any flaky tests
- [ ] Update test documentation if patterns change

### Monthly Audits

- [ ] Review overall coverage trends
- [ ] Identify areas with low coverage
- [ ] Refactor tests with poor quality scores
- [ ] Update test utilities and helpers
- [ ] Review and update test templates

### Quarterly Deep Dives

- [ ] Complete test suite refactoring if needed
- [ ] Update testing strategy based on learnings
- [ ] Evaluate and adopt new testing tools
- [ ] Team training on testing best practices

## Automated Checks

These checks should run automatically in CI:

### Pre-Commit Checks

- Run tests for changed files
- Check TypeScript compilation
- Lint test files

### PR Checks

- Full test suite passes
- Coverage meets threshold
- No skipped tests without comments
- Test execution time within limits
- Coverage diff shows no regressions

### Post-Merge Checks

- Collect test metrics
- Update coverage badges
- Archive test results for trends

## Test Review Questions

Ask these questions during test reviews:

1. **What is this test verifying?**
   - Can you understand it from the test name alone?

2. **Is this testing behavior or implementation?**
   - Would the test break if we refactor without changing behavior?

3. **Is this test reliable?**
   - Will it pass consistently across different environments?

4. **Is this test maintainable?**
   - Will developers understand it 6 months from now?

5. **Is this test fast?**
   - Could we make it faster without sacrificing quality?

6. **Is this test necessary?**
   - Does it test something not already covered?

## Coverage Analysis

### What Good Coverage Looks Like

- Critical user paths: 90%+
- Business logic: 80%+
- UI components: 70%+
- Utility functions: 90%+
- Overall: 50%+ (growing toward 80%)

### What Good Coverage Doesn't Mean

Coverage is not quality. You can have 100% coverage with poor tests:

```typescript
// Bad: 100% coverage, 0% value
it('should not throw', () => {
  render(<ComplexComponent />);
  // Doesn't test anything meaningful
});
```

```typescript
// Good: Tests actual behavior
it('should show success message after form submission', async () => {
  render(<ComplexComponent />);

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  });

  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });
});
```

## Test Refactoring Triggers

Refactor tests when you see:

1. **Duplication**: Same setup in multiple tests
   - Solution: Extract to `beforeEach` or helper function

2. **Complex Setup**: More than 10 lines of setup
   - Solution: Create test data factories

3. **Unclear Intent**: Hard to understand what's being tested
   - Solution: Better test names, simpler assertions

4. **Brittle Tests**: Break on minor changes
   - Solution: Test behavior, not implementation

5. **Slow Tests**: Take longer than 5 seconds
   - Solution: Mock expensive operations, parallelize

## Resources

- [TDD Workflow Guide](./TDD_WORKFLOW_GUIDE.md)
- [Test Templates](./TEST_TEMPLATES.md)
- [Quick Test Reference](./QUICK_TEST_REFERENCE.md)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about#priority)
- [Jest Best Practices](https://jestjs.io/docs/best-practices)

## Getting Help

If you're unsure about test quality:

1. Share the test in team chat for feedback
2. Pair with another developer on complex tests
3. Consult the test templates for patterns
4. Review similar tests in the codebase
5. Ask for a dedicated test review session

---

Remember: Good tests are investments in code quality and team productivity. Take the time to write them well.
