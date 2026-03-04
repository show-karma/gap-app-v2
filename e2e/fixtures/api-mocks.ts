import type { Page, Route } from "@playwright/test";

type RouteHandler = (route: Route) => Promise<void> | void;
type RouteOverrides = Record<string, RouteHandler>;

function jsonResponse(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

function defaultHandlers(): Record<string, RouteHandler> {
  return {
    // Auth permissions — default to guest (no permissions)
    "**/v2/auth/permissions**": (route) =>
      jsonResponse(route, {
        roles: { primaryRole: "GUEST", roles: ["GUEST"], reviewerTypes: [] },
        permissions: [],
        resourceContext: {},
        isCommunityAdmin: false,
        isProgramAdmin: false,
        isReviewer: false,
        isRegistryAdmin: false,
        isProgramCreator: false,
      }),

    // Staff authorization check
    "**/auth/staff/authorized**": (route) => jsonResponse(route, { authorized: false }),

    // Health check
    "**/health**": (route) => jsonResponse(route, { status: "ok" }),

    // Communities - default empty
    "**/v2/communities/stats**": (route) =>
      jsonResponse(route, { totalCommunities: 0, totalProjects: 0, totalGrants: 0 }),

    // Programs - default empty list
    "**/v2/funding-program-configs/community/**": (route) => jsonResponse(route, []),

    // Applications - default empty list
    "**/v2/funding-applications/program/**": (route) => jsonResponse(route, []),

    // User admin communities
    "**/v2/user/communities/admin**": (route) => jsonResponse(route, []),

    // User projects
    "**/v2/user/projects**": (route) =>
      jsonResponse(route, { payload: [], pagination: { page: 1, limit: 10, total: 0 } }),

    // My reviewer programs
    "**/v2/funding-program-configs/my-reviewer-programs**": (route) => jsonResponse(route, []),

    // KYC config - default disabled
    "**/v2/communities/*/kyc-config**": (route) => jsonResponse(route, { enabled: false }),
  };
}

// Sets up API route interception for Playwright tests.
// All indexer API calls are intercepted with sensible defaults.
// Pass `overrides` to replace specific route handlers.
export async function setupApiMocks(page: Page, overrides: RouteOverrides = {}): Promise<void> {
  const handlers = { ...defaultHandlers(), ...overrides };

  for (const [pattern, handler] of Object.entries(handlers)) {
    await page.route(pattern, handler);
  }
}

/**
 * Helper to create a route handler that returns JSON data.
 */
export function mockJson(data: unknown, status = 200): RouteHandler {
  return (route) => jsonResponse(route, data, status);
}

/**
 * Helper to create a route handler that returns an error.
 */
export function mockError(status = 500, message = "Internal Server Error"): RouteHandler {
  return (route) => jsonResponse(route, { error: message, statusCode: status }, status);
}

/**
 * Helper to create a route handler that returns 404.
 */
export function mock404(message = "Not Found"): RouteHandler {
  return mockError(404, message);
}
