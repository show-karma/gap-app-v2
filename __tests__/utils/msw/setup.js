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
if (typeof globalThis.Response === "undefined") {
  globalThis.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || "OK"
      this.headers = new Map(Object.entries(init.headers || {}))
      this.ok = this.status >= 200 && this.status < 300
      this.type = "default"
      this.redirected = false
      this.url = init.url || ""
    }
    async text() {
      if (this.body === null || this.body === undefined) return ""
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body)
    }
    async json() {
      const text = await this.text()
      return text ? JSON.parse(text) : null
    }
    async arrayBuffer() {
      const text = await this.text()
      // Use TextEncoder from util if available, otherwise create a simple buffer
      const encoder =
        typeof TextEncoder !== "undefined"
          ? new TextEncoder()
          : { encode: (str) => Buffer.from(str, "utf8") }
      return encoder.encode(text).buffer
    }
    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: new Map(this.headers),
      })
    }
  }
}

if (typeof globalThis.Request === "undefined") {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === "string" ? input : input?.url || ""
      this.method = init.method || "GET"
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body || null
      this.mode = init.mode || "cors"
      this.credentials = init.credentials || "same-origin"
      this.cache = init.cache || "default"
    }
  }
}

if (typeof globalThis.Headers === "undefined") {
  globalThis.Headers = class Headers extends Map {
    get(name) {
      return super.get(name.toLowerCase())
    }
    set(name, value) {
      return super.set(name.toLowerCase(), value)
    }
    has(name) {
      return super.has(name.toLowerCase())
    }
    delete(name) {
      return super.delete(name.toLowerCase())
    }
  }
}

// TransformStream polyfill for MSW
if (typeof globalThis.TransformStream === "undefined") {
  globalThis.TransformStream = class TransformStream {
    constructor(_transformer = {}) {
      this.readable = {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
          cancel: async () => {},
          releaseLock: () => {},
        }),
      }
      this.writable = {
        getWriter: () => ({
          write: async () => {},
          close: async () => {},
          abort: async () => {},
          releaseLock: () => {},
        }),
      }
    }
  }
}

// BroadcastChannel polyfill for MSW
if (typeof globalThis.BroadcastChannel === "undefined") {
  globalThis.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name
      this._listeners = []
    }
    postMessage(_message) {
      // No-op for testing
    }
    addEventListener(type, listener) {
      this._listeners.push({ type, listener })
    }
    removeEventListener(type, listener) {
      this._listeners = this._listeners.filter((l) => !(l.type === type && l.listener === listener))
    }
    close() {
      this._listeners = []
    }
  }
}

// WritableStream polyfill for MSW
if (typeof globalThis.WritableStream === "undefined") {
  globalThis.WritableStream = class WritableStream {
    constructor(_underlyingSink = {}) {
      this._writer = null
    }
    getWriter() {
      if (!this._writer) {
        this._writer = {
          write: async () => {},
          close: async () => {},
          abort: async () => {},
          releaseLock: () => {},
        }
      }
      return this._writer
    }
  }
}

// ReadableStream polyfill for MSW
if (typeof globalThis.ReadableStream === "undefined") {
  globalThis.ReadableStream = class ReadableStream {
    constructor(_underlyingSource = {}) {
      this._reader = null
    }
    getReader() {
      if (!this._reader) {
        this._reader = {
          read: async () => ({ done: true, value: undefined }),
          cancel: async () => {},
          releaseLock: () => {},
        }
      }
      return this._reader
    }
  }
}

// Use require instead of import to ensure polyfills execute first
const { setupServer } = require("msw/node")
// Jest will transpile TypeScript handlers file
const { handlers } = require("./handlers.ts")

// Create MSW server instance with default handlers
const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn",
  })
})

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers()
})

// Clean up after all tests are done
afterAll(() => {
  server.close()
})

module.exports = { server, http: require("msw").http }
