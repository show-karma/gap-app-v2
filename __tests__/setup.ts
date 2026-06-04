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

// ---------------------------------------------------------------------------
// Pin the default locale so number/date formatting is deterministic across
// machines. CI runs en-US, but a developer machine on another locale (e.g.
// one that uses "." as the thousands separator) makes any test that asserts
// formatted output — `(12345).toLocaleString()` → "12,345" vs "12.345" — fail
// locally while staying green on CI. We default the locale to en-US ONLY when
// a call site omits it; explicit locales (`toLocaleString("de-DE")`,
// `new Intl.NumberFormat("en-US")`) are left untouched. Test-environment only.
// ---------------------------------------------------------------------------
const FIXED_LOCALE = "en-US";
const pinToLocale = (proto: object, method: string) => {
  const original = (proto as Record<string, unknown>)[method] as
    | ((...args: unknown[]) => unknown)
    | undefined;
  if (typeof original !== "function" || (original as { __localePinned?: boolean }).__localePinned) {
    return;
  }
  const patched = function (this: unknown, locales?: unknown, options?: unknown) {
    return original.call(this, locales ?? FIXED_LOCALE, options);
  };
  (patched as { __localePinned?: boolean }).__localePinned = true;
  (proto as Record<string, unknown>)[method] = patched;
};
pinToLocale(Number.prototype, "toLocaleString");
pinToLocale(BigInt.prototype, "toLocaleString");
pinToLocale(Date.prototype, "toLocaleString");
pinToLocale(Date.prototype, "toLocaleDateString");
pinToLocale(Date.prototype, "toLocaleTimeString");
for (const ctor of ["NumberFormat", "DateTimeFormat"] as const) {
  const Original = Intl[ctor] as unknown as { new (...a: unknown[]): unknown };
  if ((Original as { __localePinned?: boolean }).__localePinned) continue;
  const Patched = function (this: unknown, locales?: unknown, options?: unknown) {
    return new Original(locales ?? FIXED_LOCALE, options);
  } as unknown as { new (...a: unknown[]): unknown; prototype: unknown; __localePinned?: boolean };
  Patched.prototype = Original.prototype;
  Patched.__localePinned = true;
  (Intl as Record<string, unknown>)[ctor] = Patched;
}

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

// Browser API mocks (only in jsdom/browser environments, not in node)
if (typeof window !== "undefined") {
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
}

// Increase default test timeout
vi.setConfig({ testTimeout: 30000 });

// ---------------------------------------------------------------------------
// Fail tests on unhandled promise rejections.
//
// Several production crashes (e.g. the form `zodResolver` re-throwing a
// `ZodError` instead of returning field errors) surface in the browser as
// *unhandled promise rejections*, not as thrown errors a component renders.
// A unit test that doesn't assert on the rendered error can stay green while
// the app is actually broken. This guard makes any rejection that escapes a
// test fail that test.
//
// We listen on both the jsdom `window` (where browser-style rejections from
// React Hook Form's `handleSubmit` are dispatched) and the Node process.
// ---------------------------------------------------------------------------
const unhandledRejections: unknown[] = [];
const recordRejection = (reason: unknown) => {
  unhandledRejections.push(reason);
};

// Capture the REAL macrotask scheduler now, before any test installs
// `vi.useFakeTimers()`. The flush in afterEach must run on the real event loop;
// using the (possibly faked) global `setTimeout` would hang until the test
// timeout whenever a test has fake timers active.
const scheduleRealMacrotask = globalThis.setTimeout.bind(globalThis);

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    recordRejection((event as PromiseRejectionEvent).reason);
    // Stop jsdom from additionally logging it as an uncaught error.
    event.preventDefault?.();
  });
}
if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("unhandledRejection", recordRejection);
}

beforeEach(() => {
  unhandledRejections.length = 0;
});

afterEach(async () => {
  // Let any microtask-queued rejections settle before we assert.
  await new Promise((resolve) => scheduleRealMacrotask(resolve, 0));
  if (unhandledRejections.length === 0) return;
  const reasons = unhandledRejections.splice(0);
  const formatted = reasons
    .map((reason) =>
      reason instanceof Error ? (reason.stack ?? reason.message) : JSON.stringify(reason)
    )
    .join("\n\n");
  throw new Error(
    `Unhandled promise rejection(s) during test (${reasons.length}):\n\n${formatted}`
  );
});
