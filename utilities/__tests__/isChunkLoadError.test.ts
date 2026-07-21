import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attemptChunkReload,
  hasChunkReloadBeenAttempted,
  isChunkLoadError,
} from "../isChunkLoadError";

const RELOAD_FLAG_KEY = "chunk-reload-attempted";
const RELOAD_TTL_MS = 60_000;

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
    vi.useFakeTimers();
    vi.setSystemTime(0);
    // jsdom's location.reload is non-configurable; stub it.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("triggers a reload and writes a timestamp guard flag on the first attempt", () => {
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(RELOAD_FLAG_KEY)).toBe("0");
  });

  it("does NOT reload a second time within the TTL window", () => {
    expect(attemptChunkReload()).toBe(true);
    reloadMock.mockClear();

    vi.setSystemTime(RELOAD_TTL_MS - 1);
    expect(attemptChunkReload()).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("allows a new reload once the TTL window has elapsed", () => {
    expect(attemptChunkReload()).toBe(true);
    reloadMock.mockClear();

    vi.setSystemTime(RELOAD_TTL_MS + 1);
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("treats a legacy boolean flag value as 'not attempted' and reloads exactly once", () => {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
    expect(attemptChunkReload()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    // The legacy value is overwritten with a real timestamp, so a second
    // call within the TTL is blocked as usual (no loop).
    reloadMock.mockClear();
    expect(attemptChunkReload()).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});

describe("hasChunkReloadBeenAttempted", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("is false when no attempt has been recorded", () => {
    expect(hasChunkReloadBeenAttempted()).toBe(false);
  });

  it("is true within the TTL window after an attempt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "1000");
    expect(hasChunkReloadBeenAttempted()).toBe(true);
  });

  it("is false once the TTL window has elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "0");
    vi.setSystemTime(RELOAD_TTL_MS + 1);
    expect(hasChunkReloadBeenAttempted()).toBe(false);
  });

  it("is false for a legacy non-numeric flag value", () => {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
    expect(hasChunkReloadBeenAttempted()).toBe(false);
  });
});
