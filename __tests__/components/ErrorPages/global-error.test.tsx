/**
 * Tests for global-error.tsx (App Router global error boundary)
 *
 * Covers:
 * - Renders without crashing
 * - Reports error to Sentry
 * - Renders NextError with statusCode 0
 */

import { render, screen } from "@testing-library/react";
import GlobalError from "@/app/global-error";

// Mock Sentry
const mockCaptureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: any[]) => mockCaptureException(...args),
}));

// Mock NextError
vi.mock("next/error", () => ({
  __esModule: true,
  default: ({ statusCode }: { statusCode: number }) => (
    <div data-testid="next-error">Error {statusCode}</div>
  ),
}));

describe("GlobalError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const error = new Error("Fatal error");

    render(<GlobalError error={error} />);

    expect(screen.getByTestId("next-error")).toBeInTheDocument();
  });

  it("should report the error to Sentry", () => {
    const error = new Error("Fatal error");

    render(<GlobalError error={error} />);

    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it("should render NextError with statusCode 0", () => {
    const error = new Error("Fatal error");

    render(<GlobalError error={error} />);

    expect(screen.getByText("Error 0")).toBeInTheDocument();
  });

  it("should handle error with digest", () => {
    const error = Object.assign(new Error("Fatal error"), {
      digest: "DIGEST_123",
    });

    render(<GlobalError error={error} />);

    expect(mockCaptureException).toHaveBeenCalledWith(error);
    expect(screen.getByTestId("next-error")).toBeInTheDocument();
  });
});
