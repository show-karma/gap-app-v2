/**
 * @jest-environment jsdom
 */

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

vi.mock("../../utilities/sentry/ignoreErrors", () => ({
  sentryIgnoreErrors: ["TestError"],
}));

describe("instrumentation-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Sentry.init WITHOUT replayIntegration in integrations array", async () => {
    // Import triggers the module's top-level code
    jest.isolateModules(() => {
      require("../../instrumentation-client");
    });

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
    jest.isolateModules(() => {
      require("../../instrumentation-client");
    });

    expect(mockLazyLoadIntegration).toHaveBeenCalledWith("replayIntegration");
  });

  it("calls Sentry.addIntegration with the resolved replay integration instance", async () => {
    jest.isolateModules(() => {
      require("../../instrumentation-client");
    });

    // Wait for the lazy-load promise to resolve
    await new Promise(process.nextTick);

    expect(mockReplayConstructor).toHaveBeenCalled();
    expect(mockAddIntegration).toHaveBeenCalledWith(mockReplayInstance);
  });

  it("exports onRequestError and onRouterTransitionStart", () => {
    let exports: Record<string, unknown> = {};
    jest.isolateModules(() => {
      exports = require("../../instrumentation-client");
    });

    expect(exports.onRequestError).toBe(mockCaptureRequestError);
    expect(exports.onRouterTransitionStart).toBe(mockCaptureRouterTransitionStart);
  });
});
