/**
 * MSW (Mock Service Worker) Setup for Jest Tests
 *
 * This file sets up MSW to intercept HTTP requests in tests.
 * It provides a consistent way to mock API responses across all tests.
 *
 * Usage:
 * - Import this file in your test setup
 * - Use the handlers to define API mocks
 * - Reset handlers between tests for clean state
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW server instance with default handlers
export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
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

export { http } from 'msw';
