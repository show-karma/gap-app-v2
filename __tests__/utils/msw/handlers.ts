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

import { HttpResponse, http } from "msw";

// Base URLs from environment
const INDEXER_API_BASE_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

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
    return HttpResponse.json({ status: "ok" });
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
        title: "Mock Project",
        description: "A mock project for testing",
      },
    });
  }),

  // Example: Project by slug endpoint
  http.get(`${INDEXER_API_BASE_URL}/v2/projects/slug/:slug`, ({ params }) => {
    const { slug } = params;

    return HttpResponse.json({
      data: {
        uid: "mock-uid",
        slug: slug,
        title: "Mock Project",
        description: "A mock project for testing",
        payoutAddress: "0x1234567890123456789012345678901234567890",
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
  http.post(
    `${INDEXER_API_BASE_URL}/v2/applications/:applicationId/comments`,
    async ({ request, params }) => {
      const { applicationId } = params;
      const body = (await request.json()) as { content: string; authorName?: string };

      return HttpResponse.json(
        {
          comment: {
            id: "mock-comment-id",
            applicationId,
            content: body.content,
            authorName: body.authorName || "Anonymous",
            authorAddress: "0x1234567890123456789012345678901234567890",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
          },
        },
        { status: 201 }
      );
    }
  ),

  // Example: Update comment endpoint
  http.put(`${INDEXER_API_BASE_URL}/v2/comments/:commentId`, async ({ request, params }) => {
    const { commentId } = params;
    const body = (await request.json()) as { content: string };

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

  // Default error handlers for common error scenarios
  // These provide baseline error handling that can be overridden in tests
  // Usage in tests: Add ?forceError=400 to URL to trigger specific error responses

  // Consolidated error handler that checks forceError query parameter
  http.all(`${INDEXER_API_BASE_URL}/v2/*`, ({ request }) => {
    const url = new URL(request.url);
    const forceError = url.searchParams.get("forceError");

    if (!forceError) {
      // No error requested, let other handlers process
      return;
    }

    switch (forceError) {
      case "400":
        return createErrorResponse("Bad Request", 400, "Invalid request parameters");
      case "401":
        return createErrorResponse("Unauthorized", 401, "Authentication required");
      case "403":
        return createErrorResponse("Forbidden", 403, "Insufficient permissions");
      case "404":
        return createErrorResponse("Not Found", 404, "Resource not found");
      case "429":
        return createErrorResponse("Too Many Requests", 429, "Rate limit exceeded");
      case "500":
        return createErrorResponse("Internal Server Error", 500, "An unexpected error occurred");
      case "502":
        return createErrorResponse("Bad Gateway", 502, "Upstream service unavailable");
      case "503":
        return createErrorResponse("Service Unavailable", 503, "Service temporarily unavailable");
      default:
        return createErrorResponse("Error", 500, `Unknown error code: ${forceError}`);
    }
  }),

  // Example error endpoints for testing specific error scenarios
  // These can be used directly in tests without query parameters
  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/400`, () => {
    return createErrorResponse("Bad Request", 400, "Invalid request parameters");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/401`, () => {
    return createErrorResponse("Unauthorized", 401, "Authentication required");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/403`, () => {
    return createErrorResponse("Forbidden", 403, "Insufficient permissions");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/404`, () => {
    return createErrorResponse("Not Found", 404, "Resource not found");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/429`, () => {
    return createErrorResponse("Too Many Requests", 429, "Rate limit exceeded");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/500`, () => {
    return createErrorResponse("Internal Server Error", 500, "An unexpected error occurred");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/502`, () => {
    return createErrorResponse("Bad Gateway", 502, "Upstream service unavailable");
  }),

  http.get(`${INDEXER_API_BASE_URL}/v2/test-errors/503`, () => {
    return createErrorResponse("Service Unavailable", 503, "Service temporarily unavailable");
  }),
];

/**
 * Helper to create authenticated request headers
 */
export function createAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
