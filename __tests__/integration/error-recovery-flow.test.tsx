/**
 * Integration tests for error boundary recovery flows.
 *
 * Covers cross-component error boundary interactions:
 * - Nested boundaries: inner catches before outer
 * - If inner boundary is absent, outer catches
 * - Component that throws on first render then succeeds on retry
 * - Error during async data display shows boundary, not blank page
 * - Multiple independent error boundaries on the same page
 * - Error in one section does not affect other sections
 * - Recovery cycle: error -> retry -> error -> retry -> success
 * - Mixed boundary types (generic + FormBuilder + Donation)
 * - Deeply nested component trees with errors
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import FormBuilderErrorBoundary from "@/components/ErrorBoundary/FormBuilderErrorBoundary";
import { getDetailedErrorInfo } from "@/utilities/donations/errorMessages";

// Mock dependencies required by DonationErrorBoundary
vi.mock("@/utilities/donations/errorMessages");
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@heroicons/react/24/solid", () => ({
  ExclamationTriangleIcon: (props: Record<string, unknown>) => (
    <svg data-testid="warning-icon" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A component that throws conditionally. Use a ref-like pattern for external control. */
let throwControls: Record<string, boolean> = {};

const ConditionalThrower = ({ id, errorMessage }: { id: string; errorMessage?: string }) => {
  if (throwControls[id]) throw new Error(errorMessage || `Error in ${id}`);
  return <div data-testid={`content-${id}`}>{`${id} content`}</div>;
};

describe("Error Recovery Flow (integration)", () => {
  const mockGetDetailedErrorInfo = getDetailedErrorInfo as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    throwControls = {};

    mockGetDetailedErrorInfo.mockReturnValue({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
      technicalMessage: "Test error",
      actionableSteps: ["Try the transaction again"],
    });

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Nested boundaries
  // -------------------------------------------------------------------------

  it("inner boundary catches error before outer boundary", () => {
    throwControls.inner = true;

    render(
      <ErrorBoundary fallback={<div data-testid="outer-fallback">Outer caught it</div>}>
        <div>
          <p>Outer content visible</p>
          <ErrorBoundary fallback={<div data-testid="inner-fallback">Inner caught it</div>}>
            <ConditionalThrower id="inner" />
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("inner-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("outer-fallback")).not.toBeInTheDocument();
    expect(screen.getByText("Outer content visible")).toBeInTheDocument();
  });

  it("outer boundary catches if no inner boundary exists", () => {
    const AlwaysThrows = () => {
      throw new Error("No inner boundary");
    };

    render(
      <ErrorBoundary fallback={<div data-testid="outer-catch">Outer handled it</div>}>
        <div>
          <AlwaysThrows />
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("outer-catch")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // First-render throw, then retry success
  // -------------------------------------------------------------------------

  it("component that throws on first render succeeds on retry", async () => {
    const user = userEvent.setup();
    // Use an external flag rather than a counter -- React 19 may call the
    // component function multiple times during its internal retry cycle.
    let shouldThrow = true;

    const ThrowOnFirstRender = () => {
      if (shouldThrow) throw new Error("First render failure");
      return <div>Successfully loaded</div>;
    };

    render(
      <ErrorBoundary>
        <ThrowOnFirstRender />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Disable throwing before clicking retry
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Successfully loaded")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Error during data display
  // -------------------------------------------------------------------------

  it("error during data rendering shows error boundary, not blank page", () => {
    const DataDisplay = ({ data }: { data: string | null }) => {
      if (data === null) {
        throw new Error("Data is null - cannot render");
      }
      return <div>{data}</div>;
    };

    render(
      <ErrorBoundary>
        <DataDisplay data={null} />
      </ErrorBoundary>
    );

    // Error boundary should show, not a blank page
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Data is null - cannot render")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Multiple independent error boundaries
  // -------------------------------------------------------------------------

  it("multiple error boundaries on same page work independently", () => {
    throwControls.sectionA = true;
    throwControls.sectionB = false;

    render(
      <div>
        <ErrorBoundary>
          <ConditionalThrower id="sectionA" />
        </ErrorBoundary>
        <ErrorBoundary>
          <ConditionalThrower id="sectionB" />
        </ErrorBoundary>
      </div>
    );

    // Section A should show error
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    // Section B should render normally
    expect(screen.getByTestId("content-sectionB")).toBeInTheDocument();
    expect(screen.getByText("sectionB content")).toBeInTheDocument();
  });

  it("error in one section does not affect other sections", () => {
    throwControls.broken = true;
    throwControls.working = false;

    render(
      <div>
        <header data-testid="page-header">Navigation</header>
        <ErrorBoundary>
          <ConditionalThrower id="broken" errorMessage="Section A crashed" />
        </ErrorBoundary>
        <ErrorBoundary>
          <ConditionalThrower id="working" />
        </ErrorBoundary>
        <footer data-testid="page-footer">Footer</footer>
      </div>
    );

    // Header and footer should be intact
    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(screen.getByTestId("page-footer")).toBeInTheDocument();
    // Working section renders normally
    expect(screen.getByTestId("content-working")).toBeInTheDocument();
    // Broken section shows error
    expect(screen.getByText("Section A crashed")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Recovery cycle: error -> retry -> error -> retry -> success
  // -------------------------------------------------------------------------

  it("supports multiple retry cycles before eventual success", async () => {
    const user = userEvent.setup();
    // Use a flag-based approach. React 19 may call the component multiple
    // times during its internal retry, so counters are unreliable.
    let failMode: "first" | "second" | "succeed" = "first";

    const FlakeyComponent = () => {
      if (failMode === "first") throw new Error("Failure #1");
      if (failMode === "second") throw new Error("Failure #2");
      return <div data-testid="success">Finally worked</div>;
    };

    render(
      <ErrorBoundary>
        <FlakeyComponent />
      </ErrorBoundary>
    );

    // First failure
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // First retry -- triggers second failure
    failMode = "second";
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Second retry -- succeeds
    failMode = "succeed";
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByTestId("success")).toBeInTheDocument();
    expect(screen.getByText("Finally worked")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Mixed boundary types
  // -------------------------------------------------------------------------

  it("mixed boundary types each handle their own errors independently", () => {
    throwControls.form = true;

    render(
      <div>
        <ErrorBoundary>
          <div data-testid="generic-section">Generic content</div>
        </ErrorBoundary>
        <FormBuilderErrorBoundary>
          <ConditionalThrower id="form" />
        </FormBuilderErrorBoundary>
      </div>
    );

    // Generic section should work fine
    expect(screen.getByTestId("generic-section")).toBeInTheDocument();
    // FormBuilder section shows its own error UI
    expect(
      screen.getByText(/An error occurred while loading the form builder/)
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Deeply nested component trees
  // -------------------------------------------------------------------------

  it("catches errors from deeply nested components", () => {
    const DeeplyNested = () => {
      throw new Error("Deep error");
    };

    const Level3 = () => (
      <div>
        <DeeplyNested />
      </div>
    );
    const Level2 = () => (
      <div>
        <Level3 />
      </div>
    );
    const Level1 = () => (
      <div>
        <Level2 />
      </div>
    );

    render(
      <ErrorBoundary>
        <Level1 />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Deep error")).toBeInTheDocument();
  });
});
