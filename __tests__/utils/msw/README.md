# MSW (Mock Service Worker) Setup

This directory contains the Mock Service Worker (MSW) configuration for testing API calls in the gap-app-v2 project.

## Overview

MSW intercepts HTTP requests at the network level, allowing you to mock API responses without modifying your application code. This provides:

- **Realistic testing**: Tests make actual HTTP requests that are intercepted
- **Type safety**: Full TypeScript support for request/response types
- **Consistency**: Same mocks work across unit, integration, and E2E tests
- **Flexibility**: Easy to override handlers per test

## File Structure

```
__tests__/utils/msw/
├── README.md       # This file
├── setup.ts        # MSW server setup and lifecycle management
└── handlers.ts     # Default API endpoint handlers
```

## Usage

### Basic Usage

MSW is automatically configured in the Jest setup. You can use the default handlers or override them in individual tests:

```typescript
import { server } from '@/__tests__/utils/msw/setup';
import { http, HttpResponse } from 'msw';

describe('My Component', () => {
  it('should fetch data successfully', async () => {
    // Use default handlers (no setup needed)
    const result = await fetchProject('project-123');
    expect(result).toBeDefined();
  });

  it('should handle custom response', async () => {
    // Override handler for this test
    server.use(
      http.get('http://localhost:4000/v2/projects/:projectId', ({ params }) => {
        return HttpResponse.json({
          data: {
            uid: params.projectId,
            title: 'Custom Test Project',
            customField: 'test-value',
          },
        });
      })
    );

    const result = await fetchProject('custom-project');
    expect(result.customField).toBe('test-value');
  });
});
```

### Handling Errors

```typescript
it('should handle API errors', async () => {
  server.use(
    http.get('http://localhost:4000/v2/projects/:projectId', () => {
      return HttpResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    })
  );

  await expect(fetchProject('non-existent')).rejects.toThrow('Project not found');
});
```

### Authentication Testing

```typescript
it('should include JWT token in requests', async () => {
  let capturedHeaders: Headers | null = null;

  server.use(
    http.post('http://localhost:4000/v2/comments', async ({ request }) => {
      capturedHeaders = request.headers;
      return HttpResponse.json({ success: true });
    })
  );

  await createComment('test comment');

  expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-token');
});
```

### Request Body Validation

```typescript
it('should send correct request body', async () => {
  let capturedBody: unknown = null;

  server.use(
    http.post('http://localhost:4000/v2/projects', async ({ request }) => {
      capturedBody = await request.json();
      return HttpResponse.json({ data: { id: 'new-project' } });
    })
  );

  await createProject({ title: 'New Project', description: 'Test' });

  expect(capturedBody).toEqual({
    title: 'New Project',
    description: 'Test',
  });
});
```

### Multiple Endpoints

```typescript
it('should handle multiple API calls', async () => {
  server.use(
    http.get('http://localhost:4000/v2/projects/:projectId', () => {
      return HttpResponse.json({
        data: { uid: 'project-1', title: 'Project 1' },
      });
    }),
    http.get('http://localhost:4000/v2/communities/:communityId', () => {
      return HttpResponse.json({
        data: { uid: 'community-1', name: 'Community 1' },
      });
    })
  );

  const [project, community] = await Promise.all([
    fetchProject('project-1'),
    fetchCommunity('community-1'),
  ]);

  expect(project.title).toBe('Project 1');
  expect(community.name).toBe('Community 1');
});
```

## Adding New Handlers

To add handlers that apply to all tests, edit `handlers.ts`:

```typescript
// In handlers.ts
export const handlers = [
  // ... existing handlers

  // New handler
  http.get(`${INDEXER_API_BASE_URL}/v2/new-endpoint`, () => {
    return HttpResponse.json({
      data: { message: 'Default response' },
    });
  }),
];
```

## Best Practices

1. **Use Default Handlers**: Define common responses in `handlers.ts`
2. **Override When Needed**: Use `server.use()` in tests for specific scenarios
3. **Reset State**: MSW automatically resets handlers after each test
4. **Type Safety**: Define TypeScript interfaces for request/response types
5. **Descriptive Responses**: Make mock data realistic and descriptive
6. **Error Cases**: Test both success and error scenarios
7. **Authentication**: Mock JWT tokens and test authentication flows

## Helper Functions

The `handlers.ts` file provides helper functions:

- `createAuthHeaders(token)`: Create authenticated request headers
- `createErrorResponse(error, statusCode, message)`: Create error responses
- `createSuccessResponse(data, statusCode, message)`: Create success responses

## Environment Variables

MSW uses the following environment variables:

- `NEXT_PUBLIC_GAP_INDEXER_URL`: Base URL for the GAP Indexer API (default: `http://localhost:4000`)

## Debugging

To see intercepted requests in test output:

```typescript
server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url);
});
```

## Resources

- [MSW Documentation](https://mswjs.io/docs/)
- [MSW GitHub](https://github.com/mswjs/msw)
- [Testing Best Practices](https://mswjs.io/docs/best-practices)
