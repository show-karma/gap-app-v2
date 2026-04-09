/**
 * Tests for the generic ErrorBoundary component.
 *
 * Covers:
 * - Rendering children when no error occurs
 * - Catching errors and displaying fallback UI
 * - Displaying the error message in the fallback
 * - "Try again" button resetting the error state
 * - Recovery after retry when the child no longer throws
 * - Custom fallback prop rendering
 * - onError callback invocation
 * - Window.__LAST_ERROR_BOUNDARY__ debug exposure
 * - Nested error boundaries (inner catches before outer)
 * - Multiple sequential errors without infinite loops
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A component that throws on demand. */
const ThrowingComponent = ({
  shouldThrow = false,
  errorMessage = "Test error",
}: {
  shouldThrow?: boolean;
  errorMessage?: string;
}) => {
  if (shouldThrow) throw new Error(errorMessage);
  return <div>Content OK</div>;
};

describe("ErrorBoundary", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // React logs caught errors to console.error -- suppress during tests.
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Clean up debug exposure
    delete (window as any).__LAST_ERROR_BOUNDARY__;
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
  });

  it("renders multiple children without error", () => {
    render(
      <ErrorBoundary>
        <span>First</span>
        <span>Second</span>
      </ErrorBoundary>
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error catching & fallback UI
  // -------------------------------------------------------------------------

  it("catches error from child component and shows default fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("displays the error message in the fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow errorMessage="Database connection failed" />
      </ErrorBoundary>
    );

    expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    // Also check data-error-message attribute
    expect(screen.getByTestId("error-boundary-fallback")).toHaveAttribute(
      "data-error-message",
      "Database connection failed"
    );
  });

  it("displays generic message when error has no message", () => {
    const BadComponent = () => {
      throw new Error("");
    };

    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // "Try again" / reset
  // -------------------------------------------------------------------------

  it("shows a Try again button in the fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("resets error state when Try again is clicked and child no longer throws", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const ConditionalThrower = () => {
      if (shouldThrow) throw new Error("Temporary failure");
      return <div>Recovered content</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Stop throwing before clicking retry
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
  });

  it("shows fallback again if child still throws after retry", async () => {
    const user = userEvent.setup();
    const AlwaysThrower = () => {
      throw new Error("Persistent error");
    };

    render(
      <ErrorBoundary>
        <AlwaysThrower />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Click retry -- child still throws, so fallback should reappear
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Persistent error")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Custom fallback prop
  // -------------------------------------------------------------------------

  it("renders custom fallback when provided via fallback prop", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
    // Default fallback should NOT render
    expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // onError callback
  // -------------------------------------------------------------------------

  it("calls onError callback with error and errorInfo", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow errorMessage="Callback test" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Callback test" }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it("does not call onError when no error occurs", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(onError).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Window debug exposure
  // -------------------------------------------------------------------------

  it("exposes error on window.__LAST_ERROR_BOUNDARY__ for E2E debugging", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow errorMessage="Debug exposure test" />
      </ErrorBoundary>
    );

    const debugInfo = (window as any).__LAST_ERROR_BOUNDARY__;
    expect(debugInfo).toBeDefined();
    expect(debugInfo.message).toBe("Debug exposure test");
    expect(debugInfo.stack).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Nested error boundaries
  // -------------------------------------------------------------------------

  it("inner boundary catches error before outer boundary", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="outer-fallback">Outer caught</div>}>
        <div>
          <p>Outer content</p>
          <ErrorBoundary fallback={<div data-testid="inner-fallback">Inner caught</div>}>
            <ThrowingComponent shouldThrow errorMessage="Inner error" />
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    );

    // Inner boundary should catch
    expect(screen.getByTestId("inner-fallback")).toBeInTheDocument();
    // Outer boundary should NOT catch
    expect(screen.queryByTestId("outer-fallback")).not.toBeInTheDocument();
    // Outer content is still rendered
    expect(screen.getByText("Outer content")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Multiple rapid errors
  // -------------------------------------------------------------------------

  it("handles multiple sequential errors without infinite loops", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow errorMessage="First error" />
      </ErrorBoundary>
    );

    expect(screen.getByText("First error")).toBeInTheDocument();

    // Reset then trigger another error
    let shouldThrow = true;
    const SequentialThrower = () => {
      if (shouldThrow) throw new Error("Second error");
      return <div>OK</div>;
    };

    rerender(
      <ErrorBoundary>
        <SequentialThrower />
      </ErrorBoundary>
    );

    // The boundary should still be in error state (either first or second error)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Now recover
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("OK")).toBeInTheDocument();
  });
});
