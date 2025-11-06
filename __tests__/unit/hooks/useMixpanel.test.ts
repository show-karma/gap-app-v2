/**
 * @file Tests for useMixpanel hook
 * @description Tests analytics tracking hook with Mixpanel integration
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useMixpanel } from "@/hooks/useMixpanel";
import mp from "mixpanel-browser";

// Mock mixpanel-browser
jest.mock("mixpanel-browser");

const mockMixpanel = mp as jest.Mocked<typeof mp>;

describe("useMixpanel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Initialization", () => {
    it("should initialize Mixpanel in production with valid key", () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-mixpanel-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      expect(mockMixpanel.init).toHaveBeenCalledWith("test-mixpanel-key");
    });

    it("should not initialize Mixpanel without key", () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "";
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      expect(mockMixpanel.init).not.toHaveBeenCalled();
    });

    it("should not initialize Mixpanel in non-production environment", () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-mixpanel-key";
      process.env.NEXT_PUBLIC_ENV = "development";

      renderHook(() => useMixpanel());

      expect(mockMixpanel.init).not.toHaveBeenCalled();
    });

    it("should not initialize Mixpanel when key is undefined", () => {
      delete process.env.NEXT_PUBLIC_MIXPANEL_KEY;
      process.env.NEXT_PUBLIC_ENV = "production";

      renderHook(() => useMixpanel());

      expect(mockMixpanel.init).not.toHaveBeenCalled();
    });
  });

  describe("Event Reporting", () => {
    it("should report event with default prefix", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await result.current.mixpanel.reportEvent({
        event: "test_event",
        properties: { key: "value" },
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "gap:test_event",
        { key: "value" },
        expect.any(Function)
      );
    });

    it("should report event with custom prefix", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel("custom"));

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await result.current.mixpanel.reportEvent({
        event: "test_event",
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "custom:test_event",
        {},
        expect.any(Function)
      );
    });

    it("should report event without properties", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await result.current.mixpanel.reportEvent({
        event: "test_event",
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "gap:test_event",
        {},
        expect.any(Function)
      );
    });

    it("should handle successful event tracking", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await expect(
        result.current.mixpanel.reportEvent({
          event: "success_event",
        })
      ).resolves.toBeUndefined();
    });

    it("should handle tracking errors", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      const trackError = new Error("Tracking failed");
      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(trackError);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
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

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await expect(
        result.current.mixpanel.reportEvent({
          event: "event_with_code_1",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("Event Reporting Without Initialization", () => {
    it("should handle events when mixpanel is not initialized", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "";
      process.env.NEXT_PUBLIC_ENV = "development";

      const { result } = renderHook(() => useMixpanel());

      // When mixpanel is not initialized, the promise should still resolve
      // but the track method won't be called
      const promise = result.current.mixpanel.reportEvent({
        event: "test_event",
      });

      // The promise should resolve immediately since mixpanel is undefined
      await expect(Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve("timeout"), 100))
      ])).resolves.toBe("timeout");

      expect(mockMixpanel.track).not.toHaveBeenCalled();
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

  describe("Event Properties", () => {
    it("should handle complex event properties", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      const complexProperties = {
        user_id: "123",
        action: "click",
        metadata: {
          nested: "value",
          count: 42,
        },
        tags: ["tag1", "tag2"],
      };

      await result.current.mixpanel.reportEvent({
        event: "complex_event",
        properties: complexProperties,
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "gap:complex_event",
        complexProperties,
        expect.any(Function)
      );
    });

    it("should handle empty properties object", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result } = renderHook(() => useMixpanel());

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await result.current.mixpanel.reportEvent({
        event: "empty_props_event",
        properties: {},
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "gap:empty_props_event",
        {},
        expect.any(Function)
      );
    });
  });

  describe("Multiple Hook Instances", () => {
    it("should work with multiple hook instances with different prefixes", async () => {
      process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-key";
      process.env.NEXT_PUBLIC_ENV = "production";

      mockMixpanel.track = jest.fn((event, props, callback) => {
        callback?.(1);
      });

      const { result: result1 } = renderHook(() => useMixpanel("prefix1"));
      const { result: result2 } = renderHook(() => useMixpanel("prefix2"));

      await waitFor(() => {
        expect(mockMixpanel.init).toHaveBeenCalled();
      });

      await result1.current.mixpanel.reportEvent({ event: "event1" });
      await result2.current.mixpanel.reportEvent({ event: "event2" });

      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "prefix1:event1",
        {},
        expect.any(Function)
      );
      expect(mockMixpanel.track).toHaveBeenCalledWith(
        "prefix2:event2",
        {},
        expect.any(Function)
      );
    });
  });
});
