/**
 * @file Tests for useMixpanel hook
 * @description Tests analytics tracking hook with lazy-loaded Mixpanel integration
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useMixpanel } from "@/hooks/useMixpanel";

const mockInit = jest.fn();
const mockTrack = jest.fn();

// Mock the dynamic import of mixpanel-browser
jest.mock("mixpanel-browser", () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    track: (...args: unknown[]) => mockTrack(...args),
  },
}));

describe("useMixpanel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe("Initialization", () => {
    it("should lazy-load and initialize Mixpanel after timeout in production", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-mixpanel-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      // Mixpanel not loaded yet
      expect(mockInit).not.toHaveBeenCalled();

      // Advance past the 3s timeout
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledWith("test-mixpanel-key");
      });
    });

    it("should lazy-load Mixpanel on user click before timeout", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-mixpanel-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      expect(mockInit).not.toHaveBeenCalled();

      // Simulate user click
      await act(async () => {
        window.dispatchEvent(new Event("click"));
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledWith("test-mixpanel-key");
      });
    });

    it("should lazy-load Mixpanel on user scroll before timeout", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-mixpanel-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      expect(mockInit).not.toHaveBeenCalled();

      // Simulate user scroll
      await act(async () => {
        window.dispatchEvent(new Event("scroll"));
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalledWith("test-mixpanel-key");
      });
    });

    it("should not initialize Mixpanel without key", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "";
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockInit).not.toHaveBeenCalled();
    });

    it("should not initialize Mixpanel in non-production environment", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-mixpanel-key";
      process.env.NEXT_PUBLIC_ENV = "development";

      renderHook(() => useMixpanel());

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockInit).not.toHaveBeenCalled();
    });

    it("should not initialize Mixpanel when key is undefined", async () => {
      delete process.env.NEXT_PUBLIC_MIXPANEL_KEY;
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockInit).not.toHaveBeenCalled();
    });
  });

  describe("Event Reporting", () => {
    it("should report event with default prefix", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockTrack.mockImplementation((_event, _props, callback) => {
        if (typeof callback === "function") {
          callback(1);
        }
      });

      const { result } = renderHook(() => useMixpanel());

      // Trigger load
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.mixpanel.reportEvent({
          event: "test_event",
          properties: { key: "value" },
        });
      });

      expect(mockTrack).toHaveBeenCalledWith(
        "gap:test_event",
        { key: "value" },
        expect.any(Function)
      );
    });

    it("should report event with custom prefix", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockTrack.mockImplementation((_event, _props, callback) => {
        if (typeof callback === "function") {
          callback(1);
        }
      });

      const { result } = renderHook(() => useMixpanel("custom"));

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.mixpanel.reportEvent({
          event: "test_event",
        });
      });

      expect(mockTrack).toHaveBeenCalledWith("custom:test_event", {}, expect.any(Function));
    });

    it("should handle tracking errors", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      const trackError = new Error("Tracking failed");
      mockTrack.mockImplementation((_event, _props, callback) => {
        if (typeof callback === "function") {
          callback(trackError);
        }
      });

      const { result } = renderHook(() => useMixpanel());

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalled();
      });

      await expect(
        result.current.mixpanel.reportEvent({
          event: "error_event",
        })
      ).rejects.toThrow("Tracking failed");
    });

    it("should not reject on error code 1", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockTrack.mockImplementation((_event, _props, callback) => {
        if (typeof callback === "function") {
          callback(1);
        }
      });

      const { result } = renderHook(() => useMixpanel());

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockInit).toHaveBeenCalled();
      });

      await expect(
        result.current.mixpanel.reportEvent({
          event: "event_with_code_1",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("Event Reporting Without Initialization", () => {
    it("should silently resolve events when mixpanel is not initialized", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "";
      process.env.NEXT_PUBLIC_ENV = "development";

      const { result } = renderHook(() => useMixpanel());

      // reportEvent should resolve immediately when mixpanel is not loaded
      await expect(
        result.current.mixpanel.reportEvent({
          event: "test_event",
        })
      ).resolves.toBeUndefined();

      expect(mockTrack).not.toHaveBeenCalled();
    });

    it("should silently resolve events before mixpanel has loaded", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      const { result } = renderHook(() => useMixpanel());

      // Before timeout triggers, mixpanel hasn't loaded yet
      await expect(
        result.current.mixpanel.reportEvent({
          event: "early_event",
        })
      ).resolves.toBeUndefined();

      expect(mockTrack).not.toHaveBeenCalled();
    });
  });

  describe("Return Value Structure", () => {
    it("should return correct structure", () => {
      const { result } = renderHook(() => useMixpanel());

      expect(result.current).toHaveProperty("mixpanel");
      expect(result.current.mixpanel).toHaveProperty("reportEvent");
      expect(typeof result.current.mixpanel.reportEvent).toBe("function");
    });
  });
});
