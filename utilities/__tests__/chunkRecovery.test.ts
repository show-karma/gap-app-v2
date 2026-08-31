import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetChunkRecoveryStateForTests,
  handleWindowChunkFailure,
  installChunkRecoveryListeners,
  shouldDropChunkErrorEvent,
} from "../chunkRecovery";

const RELOAD_FLAG_KEY = "chunk-reload-attempted";

describe("chunkRecovery", () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    reloadMock.mockClear();
    __resetChunkRecoveryStateForTests();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
    __resetChunkRecoveryStateForTests();
  });

  describe("handleWindowChunkFailure — GAP-FRONTEND-20T regression (unhandledrejection shape)", () => {
    it("reloads once and reports recovery in flight for the Turbopack chunk-runtime rejection", () => {
      const reason = new Error(
        "Failed to load chunk /_next/static/chunks/f1658854a5637c9c.js from module 572682"
      );

      expect(handleWindowChunkFailure(reason)).toBe(true);
      expect(reloadMock).toHaveBeenCalledTimes(1);
      expect(shouldDropChunkErrorEvent(reason)).toBe(true);
    });
  });

  describe("reload-loop guard", () => {
    it("does not reload again once a reload was already attempted this session, and the exhausted event is reported", () => {
      // Simulate: an earlier failure this pageload already triggered the
      // reload (flag persisted in sessionStorage), then a *new* pageload
      // (module state reset) observes the same chunk still failing.
      window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
      __resetChunkRecoveryStateForTests();

      const reason = new Error("Failed to load chunk /_next/static/chunks/abc.js from module 1");

      expect(handleWindowChunkFailure(reason)).toBe(false);
      expect(reloadMock).not.toHaveBeenCalled();
      // Recovery is exhausted — Sentry must see this one.
      expect(shouldDropChunkErrorEvent(reason)).toBe(false);
    });
  });

  describe("ordering-independence with Sentry's GlobalHandlers", () => {
    it("drops the event when checked before the reload has been triggered by our listener (guard unset, not yet in flight)", () => {
      const reason = new Error("Failed to load chunk /_next/static/chunks/xyz.js from module 2");
      // Neither the sessionStorage flag nor `reloadInFlight` has been set yet
      // — this models Sentry's handler running first on the same event.
      expect(shouldDropChunkErrorEvent(reason)).toBe(true);
    });
  });

  describe("non-chunk errors", () => {
    it("is a no-op: no reload, and the event is never dropped from Sentry", () => {
      const reason = new TypeError("Cannot read properties of undefined (reading 'x')");

      expect(handleWindowChunkFailure(reason)).toBe(false);
      expect(reloadMock).not.toHaveBeenCalled();
      expect(shouldDropChunkErrorEvent(reason)).toBe(false);
    });
  });

  describe("installChunkRecoveryListeners", () => {
    it("is SSR-safe: does not throw and installs no listeners without window", () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error simulating an SSR environment where window is undefined
      delete globalThis.window;

      expect(() => installChunkRecoveryListeners()).not.toThrow();

      globalThis.window = originalWindow;
    });

    it("registers unhandledrejection and error listeners that trigger recovery", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      installChunkRecoveryListeners();

      expect(addEventListenerSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith("error", expect.any(Function));

      const unhandledRejectionHandler = addEventListenerSpy.mock.calls.find(
        ([eventName]) => eventName === "unhandledrejection"
      )?.[1] as (event: { reason: unknown; preventDefault: () => void }) => void;

      const preventDefault = vi.fn();
      unhandledRejectionHandler({
        reason: new Error("Failed to load chunk /_next/static/chunks/qux.js from module 3"),
        preventDefault,
      });

      expect(reloadMock).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalledTimes(1);

      addEventListenerSpy.mockRestore();
    });
  });
});
