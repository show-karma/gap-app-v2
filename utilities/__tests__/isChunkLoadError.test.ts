import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attemptChunkReload, clearChunkReloadFlag, isChunkLoadError } from "../isChunkLoadError";

const RELOAD_FLAG_KEY = "chunk-reload-attempted";

describe("isChunkLoadError", () => {
  it("detects a webpack ChunkLoadError by name", () => {
    const err = Object.assign(new Error("Loading chunk 123 failed."), {
      name: "ChunkLoadError",
    });
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detects the Turbopack 'Failed to load chunk' message", () => {
    const err = new Error("Failed to load chunk /_next/static/chunks/abc123.js from module 456");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detects the webpack 'Loading chunk … failed' message without the name", () => {
    expect(isChunkLoadError(new Error("Loading chunk app-pages failed"))).toBe(true);
  });

  it("matches a bare string message", () => {
    expect(isChunkLoadError("Failed to load chunk vendors")).toBe(true);
  });

  it("does NOT match unrelated runtime errors", () => {
    expect(isChunkLoadError(new TypeError("Cannot read property 'x' of undefined"))).toBe(false);
    expect(isChunkLoadError(new Error("Request failed with status code 500"))).toBe(false);
  });

  it("does NOT match null/undefined", () => {
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("attemptChunkReload", () => {
  const reloadMock = vi.fn();

  beforeEach(() => {
    window.sessionStorage.clear();
    reloadMock.mockClear();
    // jsdom's location.reload is non-configurable; stub it.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("triggers a reload and sets the guard flag on the first attempt", () => {
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(RELOAD_FLAG_KEY)).toBe("true");
  });

  it("does NOT reload a second time once the guard flag is set", () => {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
    expect(attemptChunkReload()).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});

describe("clearChunkReloadFlag", () => {
  it("removes the guard flag", () => {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
    clearChunkReloadFlag();
    expect(window.sessionStorage.getItem(RELOAD_FLAG_KEY)).toBeNull();
  });
});
