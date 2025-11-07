# TDD (Test-Driven Development) Workflow Guide

## Overview

This guide explains how to practice Test-Driven Development (TDD) in the gap-app-v2 project. TDD is a development methodology where you write tests before writing the actual code.

## Why TDD?

- **Better Design**: Writing tests first forces you to think about the API and design before implementation
- **Higher Quality**: Tests catch bugs early and ensure code works as expected
- **Living Documentation**: Tests serve as executable documentation of how code should behave
- **Confidence**: Refactor with confidence knowing tests will catch regressions
- **Coverage**: 100% coverage of new code by default

## The TDD Cycle (Red-Green-Refactor)

```
┌─────────────┐
│  1. RED     │  Write a failing test
│  Write Test │  Define what you want to build
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. GREEN   │  Write minimal code to pass
│  Make Pass  │  Get to green as fast as possible
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  3. REFACTOR│  Clean up the code
│  Improve    │  Improve design while tests pass
└──────┬──────┘
       │
       └──────► Repeat
```

## TDD Workflow Steps

### Step 1: Write the Test First (RED)

Before writing any implementation code:

1. **Understand the Requirement**: What functionality do you need to add?
2. **Write a Test**: Create a test that describes the expected behavior
3. **Run the Test**: Verify it fails (RED) - this proves the test is working

**Example: Testing a new component**

```typescript
// __tests__/components/UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import { UserProfile } from '@/components/UserProfile';

describe('UserProfile', () => {
  it('should display user name and email', () => {
    // Arrange
    const user = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    // Act
    render(<UserProfile user={user} />);

    // Assert
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

### Step 2: Write Minimal Code (GREEN)

Write just enough code to make the test pass:

1. **Implement**: Write the simplest code that satisfies the test
2. **Run Tests**: Verify the test passes (GREEN)
3. **Don't Optimize Yet**: Focus on making it work, not making it perfect

**Example: Minimal implementation**

```typescript
// components/UserProfile.tsx
interface UserProfileProps {
  user: {
    name: string;
    email: string;
  };
}

export function UserProfile({ user }: UserProfileProps) {
  return (
    <div>
      <p>{user.name}</p>
      <p>{user.email}</p>
    </div>
  );
}
```

### Step 3: Refactor (REFACTOR)

Improve the code while keeping tests passing:

1. **Clean Up**: Improve code quality, remove duplication
2. **Run Tests**: Verify tests still pass after each change
3. **Iterate**: Repeat the cycle for the next feature

**Example: Refactored implementation**

```typescript
// components/UserProfile.tsx
interface User {
  name: string;
  email: string;
}

interface UserProfileProps {
  user: User;
  className?: string;
}

export function UserProfile({ user, className }: UserProfileProps) {
  return (
    <div className={className}>
      <h2 className="text-xl font-bold">{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
    </div>
  );
}
```

## TDD by Component Type

### React Components

**1. Start with the test:**

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**2. Implement the component:**

```typescript
// components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ children, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
```

### Custom Hooks

**1. Start with the test:**

```typescript
// __tests__/hooks/useCounter.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '@/hooks/useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should decrement counter', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });
});
```

**2. Implement the hook:**

```typescript
// hooks/useCounter.ts
import { useState } from 'react';

export function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}
```

### API Services

**1. Start with the test:**

```typescript
// __tests__/services/userService.test.ts
import { fetchUser } from '@/services/userService';
import { server } from '@/__tests__/utils/msw/setup';
import { http, HttpResponse } from 'msw';

describe('userService', () => {
  it('should fetch user by id', async () => {
    server.use(
      http.get('*/api/users/:id', () => {
        return HttpResponse.json({
          id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        });
      })
    );

    const user = await fetchUser('1');

    expect(user).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    });
  });

  it('should throw error when user not found', async () => {
    server.use(
      http.get('*/api/users/:id', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      })
    );

    await expect(fetchUser('999')).rejects.toThrow('User not found');
  });
});
```

**2. Implement the service:**

```typescript
// services/userService.ts
interface User {
  id: string;
  name: string;
  email: string;
}

export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    throw new Error('User not found');
  }

  return response.json();
}
```

### Zustand Stores

**1. Start with the test:**

```typescript
// __tests__/store/userStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '@/store/userStore';

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
  });

  it('should set user', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setUser({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    expect(result.current.user).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com'
    });
  });

  it('should clear user', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setUser({ id: '1', name: 'John', email: 'john@test.com' });
      result.current.clearUser();
    });

    expect(result.current.user).toBeNull();
  });
});
```

**2. Implement the store:**

```typescript
// store/userStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  reset: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  reset: () => set({ user: null }),
}));
```

## NPM Scripts for TDD Workflow

The project includes several npm scripts to support TDD:

### Watch Mode (Primary TDD Tool)

```bash
npm run test:watch
```

This runs Jest in watch mode, which:
- Re-runs tests automatically when files change
- Shows only failed tests after the first run
- Provides interactive commands to filter tests
- Perfect for the TDD cycle

### Run Specific Test File

```bash
npm run test:watch -- Button.test
```

Run only tests matching a pattern (faster feedback)

### Run Tests with Coverage

```bash
npm run test:coverage
```

Generate coverage report to see what needs testing

### Fast Unit Tests

```bash
npm run test:fast
```

Run only unit tests with reduced memory and timeout for quick feedback

### Debug Tests

```bash
npm run test:debug
```

Run tests with debugging information for troubleshooting

## TDD Best Practices

### 1. Write Small Tests

Each test should verify one specific behavior:

```typescript
// Good: One assertion per test
it('should display user name', () => {
  render(<UserProfile user={user} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

it('should display user email', () => {
  render(<UserProfile user={user} />);
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});

// Less ideal: Multiple assertions
it('should display user profile', () => {
  render(<UserProfile user={user} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
  expect(screen.getByText('Member since 2024')).toBeInTheDocument();
});
```

### 2. Follow AAA Pattern

Structure tests with Arrange-Act-Assert:

```typescript
it('should add items to cart', () => {
  // Arrange: Set up test data and state
  const product = { id: '1', name: 'Widget', price: 10 };
  const { result } = renderHook(() => useCart());

  // Act: Perform the action
  act(() => {
    result.current.addItem(product);
  });

  // Assert: Verify the outcome
  expect(result.current.items).toHaveLength(1);
  expect(result.current.items[0]).toEqual(product);
});
```

### 3. Test Behavior, Not Implementation

Focus on what the code does, not how it does it:

```typescript
// Good: Tests behavior
it('should show error message when form is invalid', () => {
  render(<LoginForm />);

  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});

// Less ideal: Tests implementation details
it('should set error state when form is invalid', () => {
  const { result } = renderHook(() => useLoginForm());

  act(() => {
    result.current.handleSubmit({ email: '' });
  });

  expect(result.current.errors.email).toBe('Email is required');
});
```

### 4. Use Test Templates

Start with test templates (see `/home/amaury/gap/gap-app-v2/docs/testing/TEST_TEMPLATES.md`) to speed up test creation.

### 5. Mock External Dependencies

Mock API calls, Web3 providers, and external services:

```typescript
// Mock Web3 provider
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  }),
  useBalance: () => ({
    data: { value: BigInt(1000000000000000000) }
  })
}));

// Mock API with MSW
server.use(
  http.get('*/api/projects/:id', () => {
    return HttpResponse.json({ id: '1', name: 'Test Project' });
  })
);
```

### 6. Keep Tests Fast

- Avoid unnecessary delays or timeouts
- Mock slow operations (API calls, blockchain interactions)
- Use `test:fast` for unit tests during development
- Run full test suite before committing

### 7. Write Descriptive Test Names

Test names should explain the scenario and expected outcome:

```typescript
// Good: Descriptive names
it('should show loading spinner while fetching user data', () => {});
it('should display error message when API returns 404', () => {});
it('should disable submit button when form is invalid', () => {});

// Less ideal: Vague names
it('should work', () => {});
it('should test user', () => {});
it('should handle error', () => {});
```

## TDD Adoption Checklist

When starting a new feature:

- [ ] Create a test file first (before implementation file)
- [ ] Write failing test that describes desired behavior
- [ ] Run test and verify it fails (RED)
- [ ] Write minimal code to pass the test
- [ ] Run test and verify it passes (GREEN)
- [ ] Refactor code while keeping tests green
- [ ] Add more tests for edge cases
- [ ] Run full test suite before committing
- [ ] Verify coverage meets minimum threshold (50%)

## Common TDD Scenarios

### Adding a New Feature

1. Create test file: `__tests__/components/NewFeature.test.tsx`
2. Write test describing the feature
3. Run `npm run test:watch -- NewFeature`
4. Implement feature to pass the test
5. Refactor and add more tests

### Fixing a Bug

1. Write a test that reproduces the bug (should fail)
2. Fix the bug
3. Verify the test now passes
4. Add more tests for similar edge cases

### Refactoring Existing Code

1. Ensure existing tests pass
2. Make small refactoring changes
3. Run tests after each change
4. If tests fail, revert or fix the refactoring

## Pair Programming with TDD

TDD works well with pair programming:

### Ping Pong Pattern

1. **Developer A**: Writes a failing test
2. **Developer B**: Writes code to pass the test
3. **Developer B**: Writes the next failing test
4. **Developer A**: Writes code to pass the test
5. Repeat...

This ensures both developers stay engaged and understand both the tests and implementation.

## Measuring TDD Adoption

Success criteria for TDD adoption:

1. **All New Features Have Tests**: Every new component, hook, or service has tests written first
2. **Coverage Increases**: Overall coverage should trend upward
3. **Fewer Bugs in Production**: Well-tested code should have fewer production issues
4. **Faster Development**: After the learning curve, development should speed up
5. **Team Confidence**: Developers should feel confident refactoring and changing code

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [TDD by Example (Kent Beck)](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Test Templates](/home/amaury/gap/gap-app-v2/docs/testing/TEST_TEMPLATES.md)
- [Quick Test Reference](/home/amaury/gap/gap-app-v2/docs/testing/QUICK_TEST_REFERENCE.md)

## Getting Help

If you encounter issues with TDD:

1. Check the [Quick Test Reference](./QUICK_TEST_REFERENCE.md) for common patterns
2. Use test templates to get started quickly
3. Ask in team channels for pair programming
4. Review existing tests for examples
5. Run `npm run test:debug` to troubleshoot failing tests

## Next Steps

1. Try the TDD cycle with a small feature
2. Use `npm run test:watch` for instant feedback
3. Review the [Test Templates](./TEST_TEMPLATES.md) for quick starts
4. Practice the Red-Green-Refactor cycle
5. Share your experience with the team

Remember: TDD is a skill that improves with practice. Start small and build confidence over time.
