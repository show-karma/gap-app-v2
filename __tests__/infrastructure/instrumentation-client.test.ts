/**
 * @vitest-environment jsdom
 */

import type { Event, EventHint } from "@sentry/nextjs";

// Mock @sentry/nextjs before importing the module under test
const mockInit = vi.fn();
const mockAddIntegration = vi.fn();
const mockReplayInstance = { name: "Replay" };
const mockReplayConstructor = vi.fn(() => mockReplayInstance);
const mockLazyLoadIntegration = vi.fn(() => Promise.resolve(mockReplayConstructor));
const mockCaptureRequestError = vi.fn();
const mockCaptureRouterTransitionStart = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: mockInit,
  addIntegration: mockAddIntegration,
  lazyLoadIntegration: mockLazyLoadIntegration,
  captureRequestError: mockCaptureRequestError,
  captureRouterTransitionStart: mockCaptureRouterTransitionStart,
}));

vi.mock("@/utilities/sentry/ignoreErrors", () => ({
  sentryIgnoreErrors: ["TestError"],
}));

describe("instrumentation-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("calls Sentry.init WITHOUT replayIntegration in integrations array", async () => {
    // Import triggers the module's top-level code
    await import("@/instrumentation-client");

    expect(mockInit).toHaveBeenCalledTimes(1);

    const initConfig = mockInit.mock.calls[0][0];
    // integrations should be an empty array (no eager replayIntegration)
    expect(initConfig.integrations).toEqual([]);

    // Other config should remain unchanged
    expect(initConfig.tracesSampleRate).toBe(0.01);
    expect(initConfig.replaysSessionSampleRate).toBe(0.1);
    expect(initConfig.replaysOnErrorSampleRate).toBe(1.0);
    expect(initConfig.debug).toBe(false);
    expect(initConfig.ignoreErrors).toEqual(["TestError"]);
  });

  it("calls Sentry.lazyLoadIntegration with 'replayIntegration' in browser environment", async () => {
    await import("@/instrumentation-client");

    expect(mockLazyLoadIntegration).toHaveBeenCalledWith("replayIntegration");
  });

  it("calls Sentry.addIntegration with the resolved replay integration instance", async () => {
    await import("@/instrumentation-client");

    // Wait for the lazy-load promise to resolve
    await new Promise(process.nextTick);

    expect(mockReplayConstructor).toHaveBeenCalled();
    expect(mockAddIntegration).toHaveBeenCalledWith(mockReplayInstance);
  });

  it("logs and swallows replay lazy-load failures without calling addIntegration", async () => {
    const loadError = new Error("load failed");
    mockLazyLoadIntegration.mockImplementationOnce(() => Promise.reject(loadError));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(import("@/instrumentation-client")).resolves.toBeDefined();
    await new Promise(process.nextTick);

    expect(mockAddIntegration).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("Sentry Replay lazy-load failed:", loadError);

    warnSpy.mockRestore();
  });

  it("does not add replay when Sentry returns a non-callable", async () => {
    mockLazyLoadIntegration.mockImplementationOnce(() => Promise.resolve(null));

    await import("@/instrumentation-client");
    await new Promise(process.nextTick);

    expect(mockAddIntegration).not.toHaveBeenCalled();
  });

  it("exports onRouterTransitionStart but leaves onRequestError to instrumentation.ts", async () => {
    const exports = await import("@/instrumentation-client");

    expect(exports.onRouterTransitionStart).toBe(mockCaptureRouterTransitionStart);
    // Next only reads onRequestError from the server instrumentation file; an
    // export here is dead code that hid every server-render 500 from Sentry.
    expect(exports).not.toHaveProperty("onRequestError");
  });

  describe("beforeSend — Urban VPN injected executor (GAP-FRONTEND-28K)", () => {
    const message = "Cannot read properties of undefined (reading 'M_ID')";
    const extensionUrl = "chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js";
    let beforeSend: (event: Event, hint: EventHint) => Event | null;

    beforeEach(async () => {
      await import("@/instrumentation-client");
      beforeSend = mockInit.mock.calls[0][0].beforeSend;
    });

    function createExecutorEvent(filename = "app:///executors/200.js"): Event {
      // Exact exception/stack from event a589ee7b9bb94b9ab2a66e7f82a9e0cd.
      // Sentry orders frames from oldest caller to the actual throw site.
      return {
        exception: {
          values: [
            {
              type: "TypeError",
              value: message,
              mechanism: {
                type: "auto.browser.global_handlers.onunhandledrejection",
                handled: false,
              },
              stacktrace: {
                frames: [
                  { filename, function: "E", lineno: 1, colno: 1442 },
                  { filename, function: "Y", lineno: 1, colno: 761 },
                ],
              },
            },
          ],
        },
      };
    }

    it.each(["app:///executors/200.js", extensionUrl])(
      "drops the captured M_ID exception from %s even without an originalException hint",
      (filename) => {
        expect(beforeSend(createExecutorEvent(filename), {})).toBeNull();
      }
    );

    it.each([
      "https://www.karmahq.org/_next/static/chunks/app.js",
      "app:///executors/201.js",
      "https://www.karmahq.org/executors/200.js",
    ])("keeps the same message from an unrecognized source: %s", (filename) => {
      const event = createExecutorEvent(filename);

      expect(beforeSend(event, {})).toBe(event);
    });

    it("keeps a first-party throw even when an extension frame is an older caller", () => {
      const event = createExecutorEvent();
      const exception = event.exception?.values?.[0];
      exception?.stacktrace?.frames?.push({
        filename: "https://www.karmahq.org/_next/static/chunks/app.js",
      });

      expect(beforeSend(event, {})).toBe(event);
    });

    it("keeps an application error wrapping an extension exception as its cause", () => {
      const event = createExecutorEvent();
      event.exception?.values?.push({ type: "Error", value: "Application failed" });

      expect(beforeSend(event, {})).toBe(event);
    });

    it("keeps the same message when the throw site is unknown", () => {
      const event: Event = {
        exception: { values: [{ type: "TypeError", value: message }] },
      };

      expect(beforeSend(event, {})).toBe(event);
    });

    it("keeps other failures from the executor", () => {
      const event = createExecutorEvent();
      const exception = event.exception?.values?.[0];
      if (exception) exception.value = "Some unrelated failure";

      expect(beforeSend(event, {})).toBe(event);
    });
  });

  describe("beforeSend — chunk load error gating (GAP-FRONTEND-20T)", () => {
    const RELOAD_FLAG_KEY = "chunk-reload-attempted";

    beforeEach(() => {
      window.sessionStorage.clear();
    });

    afterEach(() => {
      window.sessionStorage.clear();
    });

    it("drops a first-time chunk load error (recovery about to run)", async () => {
      await import("@/instrumentation-client");
      const initConfig = mockInit.mock.calls[0][0];

      const event = { tags: {} } as Record<string, unknown>;
      const hint = {
        originalException: new Error(
          "Failed to load chunk /_next/static/chunks/f1658854a5637c9c.js from module 572682"
        ),
      };

      expect(initConfig.beforeSend(event, hint)).toBeNull();
    });

    it("keeps and tags an exhausted chunk load error (reload already attempted)", async () => {
      window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));

      await import("@/instrumentation-client");
      const initConfig = mockInit.mock.calls[0][0];

      const event = { tags: {} } as { tags: Record<string, string> };
      const hint = {
        originalException: new Error(
          "Failed to load chunk /_next/static/chunks/abc.js from module 1"
        ),
      };

      const result = initConfig.beforeSend(event, hint);
      expect(result).toBe(event);
      expect(result.tags.chunk_recovery).toBe("exhausted");
    });

    it("does not touch non-chunk errors", async () => {
      await import("@/instrumentation-client");
      const initConfig = mockInit.mock.calls[0][0];

      const event = { tags: {} } as { tags: Record<string, string> };
      const hint = { originalException: new Error("Some unrelated failure") };

      const result = initConfig.beforeSend(event, hint);
      expect(result).toBe(event);
      expect(result.tags.chunk_recovery).toBeUndefined();
    });
  });
});
