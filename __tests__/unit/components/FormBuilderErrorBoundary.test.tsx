/**
 * Tests for the FormBuilderErrorBoundary component.
 *
 * Covers:
 * - Rendering form children when no error
 * - Catching form-specific errors with fallback UI
 * - Showing form-specific messaging (form builder context)
 * - "Try Again" button resets error state
 * - "Refresh Page" button triggers window.location.reload
 * - Custom fallback prop
 * - Error details shown in development mode
 * - Error does not crash surrounding page content
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormBuilderErrorBoundary from "@/components/ErrorBoundary/FormBuilderErrorBoundary";

// Mock the Heroicons import -- we only care about rendering, not SVG details.
vi.mock("@heroicons/react/24/solid", () => ({
  ExclamationTriangleIcon: (props: Record<string, unknown>) => (
    <svg data-testid="warning-icon" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ThrowingFormComponent = ({
  shouldThrow = false,
  errorMessage = "Form render error",
}: {
  shouldThrow?: boolean;
  errorMessage?: string;
}) => {
  if (shouldThrow) throw new Error(errorMessage);
  return (
    <form data-testid="form-content">
      <input type="text" name="field" />
      <button type="submit">Submit</button>
    </form>
  );
};

describe("FormBuilderErrorBoundary", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  // -------------------------------------------------------------------------
  // Normal rendering
  // -------------------------------------------------------------------------

  it("renders form children when no error occurs", () => {
    render(
      <FormBuilderErrorBoundary>
        <ThrowingFormComponent shouldThrow={false} />
      </FormBuilderErrorBoundary>
    );

    expect(screen.getByTestId("form-content")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error catching
  // -------------------------------------------------------------------------

  it("catches form-specific errors and shows fallback UI", () => {
    render(
      <FormBuilderErrorBoundary>
        <ThrowingFormComponent shouldThrow />
      </FormBuilderErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/An error occurred while loading the form builder/)
    ).toBeInTheDocument();
    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
  });

  it("logs the error to console.error with FormBuilder prefix", () => {
    render(
      <FormBuilderErrorBoundary>
        <ThrowingFormComponent shouldThrow errorMessage="Schema validation failed" />
      </FormBuilderErrorBoundary>
    );

    // componentDidCatch calls console.error with "FormBuilder Error:" prefix
    expect(consoleSpy).toHaveBeenCalledWith(
      "FormBuilder Error:",
      expect.objectContaining({ message: "Schema validation failed" }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  // -------------------------------------------------------------------------
  // Recovery: Try Again
  // -------------------------------------------------------------------------

  it("resets error state when Try Again is clicked", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const ConditionalForm = () => {
      if (shouldThrow) throw new Error("Temporary form error");
      return <div>Form loaded successfully</div>;
    };

    render(
      <FormBuilderErrorBoundary>
        <ConditionalForm />
      </FormBuilderErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Form loaded successfully")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Recovery: Refresh Page
  // -------------------------------------------------------------------------

  it("calls window.location.reload when Refresh Page is clicked", async () => {
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, reload: reloadMock },
    });

    render(
      <FormBuilderErrorBoundary>
        <ThrowingFormComponent shouldThrow />
      </FormBuilderErrorBoundary>
    );

    await user.click(screen.getByRole("button", { name: /refresh page/i }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Custom fallback
  // -------------------------------------------------------------------------

  it("renders custom fallback when provided via fallback prop", () => {
    render(
      <FormBuilderErrorBoundary
        fallback={<div data-testid="custom-form-fallback">Custom form error</div>}
      >
        <ThrowingFormComponent shouldThrow />
      </FormBuilderErrorBoundary>
    );

    expect(screen.getByTestId("custom-form-fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Development error details
  // -------------------------------------------------------------------------

  it("shows error details section in development mode", async () => {
    const user = userEvent.setup();
    process.env.NODE_ENV = "development";

    render(
      <FormBuilderErrorBoundary>
        <ThrowingFormComponent shouldThrow errorMessage="Dev-only error info" />
      </FormBuilderErrorBoundary>
    );

    const summary = screen.getByText(/Error details \(development only\)/);
    expect(summary).toBeInTheDocument();

    // Expand the details
    await user.click(summary);
    expect(screen.getByText(/Dev-only error info/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Isolation: error does not crash surrounding content
  // -------------------------------------------------------------------------

  it("does not crash the rest of the page when only form section throws", () => {
    render(
      <div>
        <header>Page Header</header>
        <FormBuilderErrorBoundary>
          <ThrowingFormComponent shouldThrow />
        </FormBuilderErrorBoundary>
        <footer>Page Footer</footer>
      </div>
    );

    // Surrounding content should be intact
    expect(screen.getByText("Page Header")).toBeInTheDocument();
    expect(screen.getByText("Page Footer")).toBeInTheDocument();
    // Form area shows error
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
