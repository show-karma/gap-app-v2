/**
 * Shared MSW (Mock Service Worker) server lifecycle setup.
 *
 * Import this file in per-feature setup files that need MSW.
 * It exports the server instance so tests can call server.use() for overrides.
 *
 * Usage in a feature setup file:
 *   import { server } from "@/__tests__/setup-msw";
 *   // then use `server.use(...)` in individual tests
 *
 * The default handlers from __tests__/utils/msw/handlers.ts are loaded
 * automatically. Feature-specific handlers can be merged via server.use().
 */

import { setupServer } from "msw/node";
import { handlers as defaultHandlers } from "./utils/msw/handlers";

/** MSW server instance with default handlers */
export const server = setupServer(...defaultHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

export { HttpResponse, http } from "msw";
