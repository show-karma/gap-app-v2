// Sentry and Cache Components.
//
// Next aborts a runtime prerender that reads `crypto.randomUUID()`, and Sentry
// calls it for every trace and span id. @sentry/nextjs escapes the prerender by
// running those calls inside an AsyncLocalStorage snapshot it takes when its
// server module is evaluated, under the global symbol below. On Node that is at
// startup, outside any request. On Workers the module is evaluated lazily,
// inside the first request that reaches it, so the snapshot can capture that
// request's prerender, and later ids generated "safely" then fail with
// "encountered the unstable value `crypto.randomUUID()` while prerendering".
//
// Importing this module first, before any request, takes the snapshot while it
// is still empty; the setter keeps Sentry from replacing it with its own. Every
// Worker entry that loads Next code imports it first.

import { AsyncLocalStorage } from "node:async_hooks";

const SENTRY_SAFE_RANDOM_ID_WRAPPER = Symbol.for("__SENTRY_SAFE_RANDOM_ID_WRAPPER__");
const outsideAnyRequest = AsyncLocalStorage.snapshot();

if (!Object.getOwnPropertyDescriptor(globalThis, SENTRY_SAFE_RANDOM_ID_WRAPPER)) {
  Object.defineProperty(globalThis, SENTRY_SAFE_RANDOM_ID_WRAPPER, {
    configurable: false,
    get:
      () =>
      <T>(callback: () => T): T =>
        outsideAnyRequest(callback),
    set: () => {},
  });
}
