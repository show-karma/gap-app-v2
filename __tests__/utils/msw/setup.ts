/**
 * MSW (Mock Service Worker) Setup
 *
 * This file sets up MSW to intercept HTTP requests in tests.
 * Fetch API polyfills (Response, Request, Headers) are provided by the
 * global __tests__/setup.ts file.
 *
 * Usage:
 *   import { server } from "@/__tests__/utils/msw/setup";
 *   // override handlers per-test with server.use(...)
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Create MSW server instance with default handlers
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn",
  });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests are done
afterAll(() => {
  server.close();
});

export { http } from "msw";
