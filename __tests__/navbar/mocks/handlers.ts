/**
 * MSW (Mock Service Worker) handlers for navbar testing
 * Provides realistic API mocking for search and other endpoints
 */

import { http, HttpResponse, delay } from "msw";
import {
  searchFixtures,
  getResultsByQuery,
  searchResponseScenarios,
} from "../fixtures/search-fixtures";

// Base URL for API calls
const GAP_INDEXER_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "https://gap-indexer.vercel.app";

/**
 * Search endpoint handler
 */
const searchHandler = http.get(`${GAP_INDEXER_URL}/search`, async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || "";

  // Simulate network delay
  await delay(searchFixtures.searchTiming.apiResponseTime);

  // Handle empty or short queries
  if (query.length < 3) {
    return HttpResponse.json(searchFixtures.emptySearchResults);
  }

  // Get results based on query
  const results = getResultsByQuery(query);

  // Return data directly - the SDK's search method returns results directly
  return HttpResponse.json(results);
});

/**
 * Search handler with custom scenario
 */
export const createSearchHandler = (scenario: keyof typeof searchResponseScenarios) => {
  return http.get(`${GAP_INDEXER_URL}/search`, async ({ request }) => {
    const scenarioData = searchResponseScenarios[scenario];

    await delay(searchFixtures.searchTiming.apiResponseTime);

    if ("error" in scenarioData) {
      return new HttpResponse(
        JSON.stringify({ error: scenarioData.error }),
        { status: scenarioData.status }
      );
    }

    // Return data directly, not wrapped in { data: ... }
    // The SDK's search method returns the results directly
    return HttpResponse.json(scenarioData.data);
  });
};

/**
 * Search handler with timeout simulation
 */
export const searchHandlerWithTimeout = http.get(
  `${GAP_INDEXER_URL}/search`,
  async () => {
    await delay(searchFixtures.searchTiming.networkTimeout + 1000);
    return new HttpResponse(null, { status: 408 });
  }
);

/**
 * Search handler with error
 */
export const searchHandlerWithError = (statusCode: number = 500) => {
  return http.get(`${GAP_INDEXER_URL}/search`, async () => {
    await delay(100);
    return new HttpResponse(
      JSON.stringify({ error: "Internal server error" }),
      { status: statusCode }
    );
  });
};

/**
 * Profile data endpoint handler
 */
const profileHandler = http.get(`${GAP_INDEXER_URL}/profile/:address`, async ({ params }) => {
  const { address } = params;

  await delay(100);

  return HttpResponse.json({
    data: {
      address,
      username: `user-${address}`,
      bio: "Test user bio",
      avatar: `https://example.com/avatar/${address}.png`,
    },
  });
});

/**
 * Staff authorization endpoint handler
 */
const staffAuthHandler = http.get(`${GAP_INDEXER_URL}/auth/staff/authorized`, async () => {
  await delay(100);

  return HttpResponse.json({
    authorized: false,
  });
});

/**
 * Reviewer programs endpoint handler
 */
const reviewerProgramsHandler = http.get(
  `${GAP_INDEXER_URL}/permissions/reviewer/programs`,
  async () => {
    await delay(100);

    return HttpResponse.json({
      data: [],
    });
  }
);

/**
 * Communities endpoint handler
 */
const communitiesHandler = http.get(`${GAP_INDEXER_URL}/communities`, async () => {
  await delay(100);

  return HttpResponse.json({
    data: [],
  });
});

/**
 * Default handlers for all tests
 */
export const handlers = [
  searchHandler,
  profileHandler,
  staffAuthHandler,
  reviewerProgramsHandler,
  communitiesHandler,
];

/**
 * Handlers for specific test scenarios
 */
export const scenarioHandlers = {
  // Mixed search results (default)
  mixedResults: createSearchHandler("success"),

  // Empty search results
  emptySearch: createSearchHandler("empty"),

  // Projects only
  projectsOnly: createSearchHandler("projectsOnly"),

  // Communities only
  communitiesOnly: createSearchHandler("communitiesOnly"),

  // Large result set
  largeResults: createSearchHandler("large"),

  // Grouped communities
  groupedCommunities: createSearchHandler("grouped"),

  // Error scenarios
  error404: createSearchHandler("error404"),
  error500: createSearchHandler("error500"),
  error503: createSearchHandler("error503"),
  serverError: createSearchHandler("error500"), // Alias for error500

  // Timeout
  timeout: searchHandlerWithTimeout,

  // Malformed response
  malformed: createSearchHandler("malformed"),
};

/**
 * Helper to reset handlers to default
 */
export const resetHandlers = () => {
  return handlers;
};

/**
 * Helper to override search handler with custom response
 */
export const createCustomSearchHandler = (response: any, delayMs: number = 100) => {
  return http.get(`${GAP_INDEXER_URL}/search`, async () => {
    await delay(delayMs);
    return HttpResponse.json(response);
  });
};

/**
 * Helper to create handler that always fails
 */
export const createFailingHandler = (endpoint: string, statusCode: number = 500) => {
  return http.get(`${GAP_INDEXER_URL}${endpoint}`, async () => {
    await delay(100);
    return new HttpResponse(
      JSON.stringify({ error: "Request failed" }),
      { status: statusCode }
    );
  });
};

/**
 * Helper to create handler with network delay
 */
export const createDelayedHandler = (endpoint: string, delayMs: number) => {
  return http.get(`${GAP_INDEXER_URL}${endpoint}`, async () => {
    await delay(delayMs);
    return HttpResponse.json({ data: {} });
  });
};

/**
 * Export MSW server setup for tests
 */
export { http, HttpResponse, delay };

