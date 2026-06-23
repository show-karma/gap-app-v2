import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../ErrorBoundary";

const RELOAD_FLAG_KEY = "chunk-reload-attempted";

function Throw({ error }: { error: Error }): never {
  throw error;
}

describe("ErrorBoundary", () => {
  const reloadMock = vi.fn();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    reloadMock.mockClear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
    // React logs caught errors to console.error; silence to keep output clean.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    window.sessionStorage.clear();
    consoleErrorSpy.mockRestore();
  });

  describe("generic errors", () => {
    it("renders the default fallback and does not reload", () => {
      render(
        <ErrorBoundary>
          <Throw error={new Error("boom")} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
      expect(reloadMock).not.toHaveBeenCalled();
    });
  });

  describe("chunk load errors", () => {
    it("triggers a one-time reload and shows the updating state", () => {
      render(
        <ErrorBoundary>
          <Throw error={new Error("Failed to load chunk /_next/static/chunks/x.js")} />
        </ErrorBoundary>
      );

      expect(reloadMock).toHaveBeenCalledTimes(1);
      expect(window.sessionStorage.getItem(RELOAD_FLAG_KEY)).toBe("true");
      expect(screen.getByTestId("error-boundary-chunk-recovering")).toBeInTheDocument();
      expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
    });

    it("falls back to the error UI without looping when reload was already attempted", () => {
      window.sessionStorage.setItem(RELOAD_FLAG_KEY, "true");

      render(
        <ErrorBoundary>
          <Throw error={new Error("Failed to load chunk /_next/static/chunks/x.js")} />
        </ErrorBoundary>
      );

      expect(reloadMock).not.toHaveBeenCalled();
      expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
      expect(screen.queryByTestId("error-boundary-chunk-recovering")).not.toBeInTheDocument();
    });
  });
});
