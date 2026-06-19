/**
 * Tests for components/Utilities/RouteErrorFallback.tsx
 *
 * Covers:
 * - Renders an accessible alert with the section-specific copy
 * - Shows the error digest only when present
 * - Try again button calls reset
 * - Reports through errorManager exactly once per error instance
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorManager } from "@/components/Utilities/errorManager";
import { RouteErrorFallback } from "@/components/Utilities/RouteErrorFallback";
import { renderWithProviders } from "../utils/render";

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-icon" className={className} />
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg data-testid="refresh-icon" className={className} />
  ),
}));

const mockErrorManager = vi.mocked(errorManager);

describe("RouteErrorFallback", () => {
  const reset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible alert with the section name copy", () => {
    const error = Object.assign(new Error("boom"), { digest: undefined });

    renderWithProviders(
      <RouteErrorFallback error={error} reset={reset} sectionName="grant completion" />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("The grant completion section failed to load. This is usually temporary.")
    ).toBeInTheDocument();
  });

  it("shows the error digest when present", () => {
    const error = Object.assign(new Error("boom"), { digest: "DIGEST_123" });

    renderWithProviders(<RouteErrorFallback error={error} reset={reset} sectionName="grant" />);

    expect(screen.getByText("Error ID: DIGEST_123")).toBeInTheDocument();
  });

  it("does not show the error digest when absent", () => {
    const error = Object.assign(new Error("boom"), { digest: undefined });

    renderWithProviders(<RouteErrorFallback error={error} reset={reset} sectionName="grant" />);

    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("calls reset when Try again is clicked", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("boom"), { digest: undefined });

    renderWithProviders(<RouteErrorFallback error={error} reset={reset} sectionName="grant" />);

    await user.click(screen.getByRole("button", { name: /Try again/ }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("reports the error through errorManager exactly once", () => {
    const error = Object.assign(new Error("boom"), { digest: "DIGEST_456" });

    const { rerender } = renderWithProviders(
      <RouteErrorFallback error={error} reset={reset} sectionName="grant completion" />
    );

    // Re-rendering with the same error instance must not double-report.
    rerender(<RouteErrorFallback error={error} reset={reset} sectionName="grant completion" />);

    expect(mockErrorManager).toHaveBeenCalledTimes(1);
    expect(mockErrorManager).toHaveBeenCalledWith(
      "grant completion route error",
      error,
      expect.objectContaining({ digest: "DIGEST_456", section: "grant completion" })
    );
  });
});
