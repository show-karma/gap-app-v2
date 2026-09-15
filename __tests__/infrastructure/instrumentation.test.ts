const mockCaptureRequestError = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: mockCaptureRequestError,
}));

vi.mock("@/utilities/env", () => ({}));
vi.mock("@/sentry.server.config", () => ({}));
vi.mock("@/sentry.edge.config", () => ({}));

describe("instrumentation (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exports onRequestError as Sentry.captureRequestError", async () => {
    const exports = await import("@/instrumentation");

    expect(exports.onRequestError).toBe(mockCaptureRequestError);
  });

  it("still exposes register()", async () => {
    const exports = await import("@/instrumentation");

    expect(typeof exports.register).toBe("function");
  });
});
