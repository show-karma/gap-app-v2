/**
 * MSW Request Handlers
 *
 * This file contains mock API handlers for testing.
 * Define handlers for all API endpoints that your tests interact with.
 *
 * Example usage in tests:
 * ```typescript
 * import { server } from '@/__tests__/utils/msw/setup';
 * import { http, HttpResponse } from 'msw';
 *
 * it('should handle custom response', async () => {
 *   server.use(
 *     http.get('/api/custom', () => {
 *       return HttpResponse.json({ data: 'custom' });
 *     })
 *   );
 *   // ... rest of test
 * });
 * ```
 */

import { http, HttpResponse } from 'msw';

// Base URLs from environment
const INDEXER_API_BASE_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || 'http://localhost:4000';

// Type definitions for common API responses
export interface ApiErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

/**
 * Default handlers for common API endpoints
 * These can be overridden in individual tests using server.use()
 */
export const handlers = [
  // Example: Health check endpoint
  http.get(`${INDEXER_API_BASE_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  // Example: Projects endpoint
  http.get(`${INDEXER_API_BASE_URL}/v2/projects`, () => {
    return HttpResponse.json({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
      },
    });
  }),

  // Example: Single project endpoint
  http.get(`${INDEXER_API_BASE_URL}/v2/projects/:projectId`, ({ params }) => {
    const { projectId } = params;

    return HttpResponse.json({
      data: {
        uid: projectId,
        title: 'Mock Project',
        description: 'A mock project for testing',
      },
    });
  }),

  // Example: Project by slug endpoint
  http.get(`${INDEXER_API_BASE_URL}/v2/projects/slug/:slug`, ({ params }) => {
    const { slug } = params;

    return HttpResponse.json({
      data: {
        uid: 'mock-uid',
        slug: slug,
        title: 'Mock Project',
        description: 'A mock project for testing',
        payoutAddress: '0x1234567890123456789012345678901234567890',
      },
    });
  }),

  // Example: Communities endpoint
  http.get(`${INDEXER_API_BASE_URL}/v2/communities`, () => {
    return HttpResponse.json({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
      },
    });
  }),

  // Example: Application comments endpoint
  http.get(`${INDEXER_API_BASE_URL}/v2/applications/:applicationId/comments`, ({ params }) => {
    const { applicationId } = params;

    return HttpResponse.json({
      comments: [],
      meta: {
        total: 0,
        applicationId,
      },
    });
  }),

  // Example: Create comment endpoint
  http.post(`${INDEXER_API_BASE_URL}/v2/applications/:applicationId/comments`, async ({ request, params }) => {
    const { applicationId } = params;
    const body = await request.json() as { content: string; authorName?: string };

    return HttpResponse.json({
      comment: {
        id: 'mock-comment-id',
        applicationId,
        content: body.content,
        authorName: body.authorName || 'Anonymous',
        authorAddress: '0x1234567890123456789012345678901234567890',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      },
    }, { status: 201 });
  }),

  // Example: Update comment endpoint
  http.put(`${INDEXER_API_BASE_URL}/v2/comments/:commentId`, async ({ request, params }) => {
    const { commentId } = params;
    const body = await request.json() as { content: string };

    return HttpResponse.json({
      comment: {
        id: commentId,
        content: body.content,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  // Example: Delete comment endpoint
  http.delete(`${INDEXER_API_BASE_URL}/v2/comments/:commentId`, ({ params }) => {
    const { commentId } = params;

    return HttpResponse.json({
      success: true,
      commentId,
    });
  }),

  // Example: Error response handler (can be used in tests)
  // This is commented out by default but shows how to handle errors
  /*
  http.get(`${INDEXER_API_BASE_URL}/v2/error-example`, () => {
    return new HttpResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    );
  }),
  */
];

/**
 * Helper to create authenticated request headers
 */
export function createAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': token,
  };
}

/**
 * Helper to create error responses
 */
export function createErrorResponse(
  error: string,
  statusCode: number = 400,
  message?: string
): ReturnType<typeof HttpResponse.json> {
  return HttpResponse.json(
    {
      error,
      message,
      statusCode,
    } as ApiErrorResponse,
    { status: statusCode }
  );
}

/**
 * Helper to create success responses
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string
): ReturnType<typeof HttpResponse.json> {
  return HttpResponse.json(
    {
      data,
      message,
    } as ApiSuccessResponse<T>,
    { status: statusCode }
  );
}
