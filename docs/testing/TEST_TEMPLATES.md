# Test Templates

Quick-start templates for common testing scenarios in gap-app-v2.

## Table of Contents

- [React Component Test](#react-component-test)
- [Custom Hook Test](#custom-hook-test)
- [API Service Test](#api-service-test)
- [Zustand Store Test](#zustand-store-test)
- [Next.js Page Test](#nextjs-page-test)
- [Integration Test](#integration-test)
- [E2E Test (Cypress)](#e2e-test-cypress)

---

## React Component Test

**File**: `__tests__/components/ComponentName.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  const defaultProps = {
    // Add default props here
  };

  it('should render successfully', () => {
    render(<ComponentName {...defaultProps} />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    const handleClick = jest.fn();

    render(<ComponentName {...defaultProps} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button', { name: /button text/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
    render(<ComponentName {...defaultProps} isLoading />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const errorMessage = 'Something went wrong';

    render(<ComponentName {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should conditionally render based on props', () => {
    const { rerender } = render(<ComponentName {...defaultProps} showDetails={false} />);

    expect(screen.queryByTestId('details')).not.toBeInTheDocument();

    rerender(<ComponentName {...defaultProps} showDetails />);

    expect(screen.getByTestId('details')).toBeInTheDocument();
  });
});
```

---

## Custom Hook Test

**File**: `__tests__/hooks/useHookName.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHookName } from '@/hooks/useHookName';

describe('useHookName', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useHookName());

    expect(result.current.value).toBe(initialValue);
    expect(result.current.isLoading).toBe(false);
  });

  it('should update state when action is called', () => {
    const { result } = renderHook(() => useHookName());

    act(() => {
      result.current.updateValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });

  it('should handle async operations', async () => {
    const { result } = renderHook(() => useHookName());

    act(() => {
      result.current.fetchData();
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should handle errors', async () => {
    const { result } = renderHook(() => useHookName());

    act(() => {
      result.current.fetchData('invalid-id');
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toContain('Error message');
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useHookName());

    act(() => {
      result.current.startPolling();
    });

    unmount();

    // Verify cleanup happened (e.g., timers cleared, subscriptions cancelled)
  });
});
```

---

## API Service Test

**File**: `__tests__/services/serviceName.test.ts`

```typescript
import { fetchData, createData, updateData, deleteData } from '@/services/serviceName';
import { server } from '@/__tests__/utils/msw/setup';
import { http, HttpResponse } from 'msw';

describe('serviceName', () => {
  describe('fetchData', () => {
    it('should fetch data successfully', async () => {
      const mockData = { id: '1', name: 'Test' };

      server.use(
        http.get('*/api/endpoint', () => {
          return HttpResponse.json(mockData);
        })
      );

      const result = await fetchData('1');

      expect(result).toEqual(mockData);
    });

    it('should handle 404 error', async () => {
      server.use(
        http.get('*/api/endpoint', () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(fetchData('999')).rejects.toThrow('Not found');
    });

    it('should handle network error', async () => {
      server.use(
        http.get('*/api/endpoint', () => {
          return HttpResponse.error();
        })
      );

      await expect(fetchData('1')).rejects.toThrow();
    });
  });

  describe('createData', () => {
    it('should create data successfully', async () => {
      const newData = { name: 'New Item' };
      const createdData = { id: '1', ...newData };

      server.use(
        http.post('*/api/endpoint', async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(newData);
          return HttpResponse.json(createdData, { status: 201 });
        })
      );

      const result = await createData(newData);

      expect(result).toEqual(createdData);
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post('*/api/endpoint', () => {
          return HttpResponse.json(
            { error: 'Validation failed' },
            { status: 400 }
          );
        })
      );

      await expect(createData({})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateData', () => {
    it('should update data successfully', async () => {
      const updatedData = { id: '1', name: 'Updated' };

      server.use(
        http.put('*/api/endpoint/:id', () => {
          return HttpResponse.json(updatedData);
        })
      );

      const result = await updateData('1', { name: 'Updated' });

      expect(result).toEqual(updatedData);
    });
  });

  describe('deleteData', () => {
    it('should delete data successfully', async () => {
      server.use(
        http.delete('*/api/endpoint/:id', () => {
          return HttpResponse.json(null, { status: 204 });
        })
      );

      await expect(deleteData('1')).resolves.not.toThrow();
    });
  });
});
```

---

## Zustand Store Test

**File**: `__tests__/store/storeName.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStoreName } from '@/store/storeName';

describe('storeName', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStoreName.getState().reset();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useStoreName());

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should add item to store', () => {
    const { result } = renderHook(() => useStoreName());
    const newItem = { id: '1', name: 'Test Item' };

    act(() => {
      result.current.addItem(newItem);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual(newItem);
  });

  it('should update item in store', () => {
    const { result } = renderHook(() => useStoreName());
    const item = { id: '1', name: 'Test Item' };

    act(() => {
      result.current.addItem(item);
      result.current.updateItem('1', { name: 'Updated Item' });
    });

    expect(result.current.items[0].name).toBe('Updated Item');
  });

  it('should remove item from store', () => {
    const { result } = renderHook(() => useStoreName());
    const item = { id: '1', name: 'Test Item' };

    act(() => {
      result.current.addItem(item);
      result.current.removeItem('1');
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('should handle async actions', async () => {
    const { result } = renderHook(() => useStoreName());

    act(() => {
      result.current.fetchItems();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('should persist selected state', () => {
    const { result } = renderHook(() => useStoreName());

    act(() => {
      result.current.setSelectedId('1');
    });

    expect(result.current.selectedId).toBe('1');

    // Verify persistence if using localStorage/sessionStorage
    expect(localStorage.getItem('selectedId')).toBe('1');
  });
});
```

---

## Next.js Page Test

**File**: `__tests__/app/page-name/page.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import Page from '@/app/page-name/page';
import { server } from '@/__tests__/utils/msw/setup';
import { http, HttpResponse } from 'msw';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/page-name',
}));

describe('Page', () => {
  it('should render page content', async () => {
    const mockData = { title: 'Page Title', content: 'Page Content' };

    server.use(
      http.get('*/api/page-data', () => {
        return HttpResponse.json(mockData);
      })
    );

    render(await Page({ params: { id: '1' }, searchParams: {} }));

    await waitFor(() => {
      expect(screen.getByText('Page Title')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    render(<Loading />); // If you have a separate loading component

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    server.use(
      http.get('*/api/page-data', () => {
        return HttpResponse.json({ error: 'Failed to load' }, { status: 500 });
      })
    );

    render(await Page({ params: { id: '1' }, searchParams: {} }));

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should handle search params', async () => {
    const searchParams = { filter: 'active', sort: 'name' };

    render(await Page({ params: { id: '1' }, searchParams }));

    // Verify that search params affect the rendered content
    await waitFor(() => {
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });
});
```

---

## Integration Test

**File**: `__tests__/integration/feature-name.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeatureComponent } from '@/components/FeatureComponent';
import { server } from '@/__tests__/utils/msw/setup';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/__tests__/utils/testProviders';

describe('Feature Integration', () => {
  it('should complete full user workflow', async () => {
    // Setup API mocks
    server.use(
      http.get('*/api/data', () => {
        return HttpResponse.json({ items: [] });
      }),
      http.post('*/api/data', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ id: '1', ...body }, { status: 201 });
      })
    );

    // Render with all providers (React Query, Wagmi, etc.)
    renderWithProviders(<FeatureComponent />);

    // Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText(/no items/i)).toBeInTheDocument();
    });

    // Interact with the UI
    fireEvent.click(screen.getByRole('button', { name: /add item/i }));

    // Fill out form
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'New Item' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Verify result
    await waitFor(() => {
      expect(screen.getByText('New Item')).toBeInTheDocument();
    });
  });

  it('should handle error recovery', async () => {
    // First request fails
    server.use(
      http.get('*/api/data', () => {
        return HttpResponse.error();
      })
    );

    renderWithProviders(<FeatureComponent />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Update mock to succeed
    server.use(
      http.get('*/api/data', () => {
        return HttpResponse.json({ items: [{ id: '1', name: 'Item' }] });
      })
    );

    // Retry
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Item')).toBeInTheDocument();
    });
  });

  it('should maintain state across navigation', async () => {
    const { rerender } = renderWithProviders(<FeatureComponent tab="first" />);

    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: 'test' },
    });

    // Switch tabs
    rerender(<FeatureComponent tab="second" />);
    rerender(<FeatureComponent tab="first" />);

    // Verify search state persisted
    expect(screen.getByLabelText(/search/i)).toHaveValue('test');
  });
});
```

---

## E2E Test (Cypress)

**File**: `cypress/e2e/feature-name.cy.ts`

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup: Clear state, login, etc.
    cy.visit('/');
    cy.login(); // Custom command for authentication
  });

  it('should complete user flow', () => {
    // Navigate to feature
    cy.findByRole('link', { name: /feature name/i }).click();

    // Verify page loaded
    cy.url().should('include', '/feature');
    cy.findByRole('heading', { name: /feature title/i }).should('be.visible');

    // Interact with UI
    cy.findByRole('button', { name: /add item/i }).click();

    // Fill out form
    cy.findByLabelText(/name/i).type('Test Item');
    cy.findByLabelText(/description/i).type('Test Description');

    // Submit
    cy.findByRole('button', { name: /submit/i }).click();

    // Verify success
    cy.findByText('Test Item').should('be.visible');
    cy.findByText(/success/i).should('be.visible');
  });

  it('should handle validation errors', () => {
    cy.findByRole('button', { name: /add item/i }).click();

    // Submit without filling form
    cy.findByRole('button', { name: /submit/i }).click();

    // Verify validation errors
    cy.findByText(/name is required/i).should('be.visible');
    cy.findByText(/description is required/i).should('be.visible');
  });

  it('should persist data after page reload', () => {
    // Add item
    cy.findByRole('button', { name: /add item/i }).click();
    cy.findByLabelText(/name/i).type('Test Item');
    cy.findByRole('button', { name: /submit/i }).click();

    // Reload page
    cy.reload();

    // Verify item still exists
    cy.findByText('Test Item').should('be.visible');
  });

  it('should handle network errors gracefully', () => {
    // Intercept API call to return error
    cy.intercept('POST', '/api/items', {
      statusCode: 500,
      body: { error: 'Server error' },
    }).as('createItem');

    cy.findByRole('button', { name: /add item/i }).click();
    cy.findByLabelText(/name/i).type('Test Item');
    cy.findByRole('button', { name: /submit/i }).click();

    // Verify error handling
    cy.wait('@createItem');
    cy.findByText(/server error/i).should('be.visible');
  });
});
```

---

## Quick Commands

Copy these commands for quick test creation:

```bash
# Create component test
touch __tests__/components/ComponentName.test.tsx

# Create hook test
touch __tests__/hooks/useHookName.test.ts

# Create service test
touch __tests__/services/serviceName.test.ts

# Create store test
touch __tests__/store/storeName.test.ts

# Create integration test
touch __tests__/integration/feature-name.test.tsx

# Create E2E test
touch cypress/e2e/feature-name.cy.ts
```

## Template Variables to Replace

When using these templates, replace:

- `ComponentName` - Your component name
- `HookName` - Your hook name
- `serviceName` - Your service name
- `storeName` - Your store name
- `feature-name` - Your feature name
- `page-name` - Your page route
- `defaultProps` - Actual default props for your component
- `initialValue` - Initial value for your state
- `mockData` - Appropriate mock data for your use case
- `Expected Text` - Text you expect to see
- `button text` - Actual button text

## Additional Resources

- [TDD Workflow Guide](./TDD_WORKFLOW_GUIDE.md)
- [Quick Test Reference](./QUICK_TEST_REFERENCE.md)
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Cypress Documentation](https://docs.cypress.io/)
