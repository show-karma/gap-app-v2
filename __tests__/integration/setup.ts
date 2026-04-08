/**
 * Integration test setup for journey tests.
 *
 * Re-exports the existing MSW server and lifecycle helpers from
 * __tests__/msw/server.ts. Journey tests import from here for a
 * single, consistent entry point.
 *
 * The MSW server intercepts axios/fetch at the HTTP boundary so
 * real React Query hooks and real service functions run unmodified.
 * Only framework boundaries (next/navigation, next/image, nuqs) are mocked.
 */

export { HttpResponse, http } from "msw";
export { BASE } from "../msw/handlers/base-url";
export { installMswLifecycle, server } from "../msw/server";
