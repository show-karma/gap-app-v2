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

// Set up fetch API polyfills BEFORE importing MSW
// MSW v2 requires Response, Request, and Headers to be available globally
// These are minimal polyfills for testing - just enough to make MSW work
if (typeof globalThis.Response === "undefined") {
  // @ts-expect-error - Minimal polyfill for test environment
  globalThis.Response = class Response {
    body: any;
    status: number;
    statusText: string;
    headers: Map<string, string>;
    ok: boolean;
    type: string;
    redirected: boolean;
    url: string;

    constructor(body?: any, init: any = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || "OK";
      this.headers = new Map(Object.entries(init.headers || {}));
      this.ok = this.status >= 200 && this.status < 300;
      this.type = "default";
      this.redirected = false;
      this.url = init.url || "";
    }
    async text(): Promise<string> {
      if (this.body === null || this.body === undefined) return "";
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
    }
    async json(): Promise<any> {
      const text = await this.text();
      return text ? JSON.parse(text) : null;
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      const text = await this.text();
      const encoder =
        typeof TextEncoder !== "undefined"
          ? new TextEncoder()
          : { encode: (str: string) => Buffer.from(str, "utf8") };
      return encoder.encode(text).buffer;
    }
    clone(): Response {
      // @ts-expect-error
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: new Map(this.headers),
      });
    }
    static error(): Response {
      // @ts-expect-error
      return new Response(null, { status: 0, statusText: "" });
    }
    static redirect(url: string, status?: number): Response {
      // @ts-expect-error
      return new Response(null, { status: status || 302, headers: { Location: url } });
    }
  };
}

if (typeof globalThis.Request === "undefined") {
  // @ts-expect-error - Minimal polyfill for test environment
  globalThis.Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;
    body: any;
    mode: string;
    credentials: string;
    cache: string;

    constructor(input: any, init: any = {}) {
      this.url = typeof input === "string" ? input : input?.url || "";
      this.method = init.method || "GET";
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body || null;
      this.mode = init.mode || "cors";
      this.credentials = init.credentials || "same-origin";
      this.cache = init.cache || "default";
    }
  };
}

if (typeof globalThis.Headers === "undefined") {
  // @ts-expect-error - Minimal polyfill for test environment
  globalThis.Headers = class Headers extends Map {
    get(name: string): string | undefined {
      return super.get(name.toLowerCase());
    }
    set(name: string, value: string): this {
      return super.set(name.toLowerCase(), value);
    }
    has(name: string): boolean {
      return super.has(name.toLowerCase());
    }
    delete(name: string): boolean {
      return super.delete(name.toLowerCase());
    }
    append(name: string, value: string): void {
      this.set(name, value);
    }
  };
}

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
