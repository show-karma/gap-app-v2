// Set up fetch API polyfills synchronously BEFORE any modules are loaded
// MSW v2 requires Response, Request, and Headers to be available globally
// This runs synchronously before Jest loads any test files

// Use Node's built-in fetch if available (Node 18+), otherwise provide polyfills
if (typeof globalThis.Response === 'undefined') {
  // Try to use Node's native fetch API
  try {
    // Node 18+ has fetch globally, but Jest's environment might not expose it
    // We'll provide a minimal polyfill that MSW can use
    globalThis.Response = class Response {
      constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.statusText = init.statusText || 'OK';
        this.headers = new Map(Object.entries(init.headers || {}));
        this.ok = this.status >= 200 && this.status < 300;
        this.type = 'default';
        this.redirected = false;
        this.url = init.url || '';
      }
      async text() {
        if (this.body === null || this.body === undefined) return '';
        return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
      }
      async json() {
        const text = await this.text();
        return text ? JSON.parse(text) : null;
      }
      async arrayBuffer() {
        const text = await this.text();
        return new TextEncoder().encode(text).buffer;
      }
      clone() {
        return new Response(this.body, {
          status: this.status,
          statusText: this.statusText,
          headers: new Map(this.headers),
        });
      }
    };
  } catch (e) {
    // Fallback if class definition fails
  }
}

if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : (input?.url || '');
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body || null;
      this.mode = init.mode || 'cors';
      this.credentials = init.credentials || 'same-origin';
      this.cache = init.cache || 'default';
    }
  };
}

if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = class Headers extends Map {
    get(name) {
      return super.get(name.toLowerCase());
    }
    set(name, value) {
      return super.set(name.toLowerCase(), value);
    }
    has(name) {
      return super.has(name.toLowerCase());
    }
    delete(name) {
      return super.delete(name.toLowerCase());
    }
  };
}

module.exports = async () => {
  process.env.TZ = "UTC";
};
