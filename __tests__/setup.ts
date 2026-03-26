/**
 * Vitest global setup file
 *
 * Contains only environment polyfills that ALL tests need.
 * Module-specific mocks (Privy, wagmi, etc.) should be in individual test files.
 */
import "@testing-library/jest-dom/vitest";
import { TextDecoder, TextEncoder } from "node:util";

// Set timezone for consistent test results
process.env.TZ = "UTC";

// Polyfills for jsdom environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Fetch API polyfills for MSW (jsdom doesn't expose Node's native fetch)
if (typeof globalThis.Response === "undefined") {
  // @ts-expect-error - Minimal polyfill for test environment
  globalThis.Response = class Response {
    body: unknown;
    status: number;
    statusText: string;
    headers: Map<string, string>;
    ok: boolean;
    type: string;
    redirected: boolean;
    url: string;

    constructor(body?: unknown, init: Record<string, unknown> = {}) {
      this.body = body;
      this.status = (init.status as number) || 200;
      this.statusText = (init.statusText as string) || "OK";
      this.headers = new Map(Object.entries((init.headers as Record<string, string>) || {}));
      this.ok = this.status >= 200 && this.status < 300;
      this.type = "default";
      this.redirected = false;
      this.url = (init.url as string) || "";
    }
    async text(): Promise<string> {
      if (this.body === null || this.body === undefined) return "";
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
    }
    async json(): Promise<unknown> {
      const text = await this.text();
      return text ? JSON.parse(text) : null;
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      const text = await this.text();
      return new TextEncoder().encode(text).buffer;
    }
    clone(): Response {
      // @ts-expect-error
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: new Map(this.headers),
      });
    }
  };
}

if (typeof globalThis.Request === "undefined") {
  // @ts-expect-error - Minimal polyfill for test environment
  globalThis.Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;
    body: unknown;
    mode: string;
    credentials: string;
    cache: string;

    constructor(input: unknown, init: Record<string, unknown> = {}) {
      this.url = typeof input === "string" ? input : (input as { url?: string })?.url || "";
      this.method = (init.method as string) || "GET";
      this.headers = new Map(Object.entries((init.headers as Record<string, string>) || {}));
      this.body = init.body || null;
      this.mode = (init.mode as string) || "cors";
      this.credentials = (init.credentials as string) || "same-origin";
      this.cache = (init.cache as string) || "default";
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

// Stream API polyfills for MSW v2.12+ (SSE/streaming support requires them)
if (typeof globalThis.WritableStream === "undefined") {
  const { WritableStream, ReadableStream, TransformStream } = await import("node:stream/web");
  // @ts-expect-error - Polyfill for jsdom test environment
  globalThis.WritableStream = WritableStream;
  // @ts-expect-error - Polyfill for jsdom test environment
  if (typeof globalThis.ReadableStream === "undefined") globalThis.ReadableStream = ReadableStream;
  // @ts-expect-error - Polyfill for jsdom test environment
  if (typeof globalThis.TransformStream === "undefined")
    globalThis.TransformStream = TransformStream;
}

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof global.IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof global.ResizeObserver;

// Increase default test timeout
vi.setConfig({ testTimeout: 30000 });
